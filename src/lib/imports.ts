import { ApiError, apiErrors, createItemType, type ItemType } from '$lib/api.js';
import { remember, rewriteItems } from '$lib/catalog.js';
import * as m from '$lib/paraglide/messages.js';

export const IMPORT_LIMIT = 100;

// A hundred objects weigh about five kilobytes; twenty times that is room to
// spare and keeps a paste of several megabytes from being turned into as many
// objects as it has lines before anything can refuse it.
export const PASTE_LIMIT = 100_000;

export interface PastedItem {
	line: number;
	name: string;
}

export interface ImportRefusal {
	line: number;
	name: string;
	message: string;
}

export interface ImportReport {
	created: number;
	reused: number;
	refused: ImportRefusal[];
}

// The API's unique_item_type_name_per_household, not `fold()` from catalog.ts:
// searching folds diacritics away, the constraint does not.
function normalized(name: string): string {
	return name.trim().toLowerCase();
}

export function parseItems(text: string): PastedItem[] {
	const seen = new Set<string>();
	const wanted: PastedItem[] = [];
	text.split(/\r\n|[\r\n]/).forEach((row, at) => {
		const name = row.trim();
		if (!name || seen.has(normalized(name))) return;
		seen.add(normalized(name));
		wanted.push({ line: at + 1, name });
	});
	return wanted;
}

function said(refusal: unknown): string {
	if (!(refusal instanceof ApiError)) return m.api_unreachable();
	return apiErrors(refusal)
		.map((error) => error.message)
		.join(' ');
}

// The cache is written once, at the end: going through `rewriteItems` line by
// line would invalidate the catalog a hundred times over.
export async function importItems({
	household,
	wanted,
	held,
	adopt,
	progressed,
	stopped
}: {
	household: number;
	wanted: PastedItem[];
	held: number[];
	adopt: (item: ItemType) => Promise<unknown>;
	progressed: (done: number) => void;
	stopped?: () => boolean;
}): Promise<ImportReport> {
	const report: ImportReport = { created: 0, reused: 0, refused: [] };
	const gathered: ItemType[] = [];
	const taken = new Set(held);
	try {
		for (const [at, one] of wanted.entries()) {
			// Between two objects and never inside one: giving up between the
			// catalog entry and the line it deserves would leave behind exactly the
			// half-done state that stopping is meant to spare.
			if (stopped?.()) break;
			try {
				const { item, created } = await createItemType(household, one.name);
				gathered.push(item);
				if (!taken.has(item.id)) {
					await adopt(item);
					taken.add(item.id);
				}
				// Counted last: a line the collection refused is a refusal, not a
				// creation, and the three counts have to add up to what was pasted.
				if (created) report.created += 1;
				else report.reused += 1;
			} catch (refusal) {
				report.refused.push({ line: one.line, name: one.name, message: said(refusal) });
			}
			progressed(at + 1);
		}
	} finally {
		if (gathered.length > 0) rewriteItems(household, (all) => gathered.reduce(remember, all));
	}
	return report;
}
