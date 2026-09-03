import {
	createItemType,
	createKit,
	createKitItem,
	deleteKit,
	readKit,
	type ItemType,
	type KitItem
} from '$lib/api.js';
import { said } from '$lib/submission.svelte.js';

export interface CopiedItem {
	item: ItemType;
	quantity: number;
}

export interface CopyRefusal {
	name: string;
	message: string;
}

export interface CopyReport {
	copied: number;
	refused: CopyRefusal[];
	moved: boolean;
}

// Copied lines all land common — a person belongs to one household and has no
// counterpart in another — so the three lines an object holds here would become
// three identical common lines there, which `KitItem` has no unique constraint
// to refuse. One line per object then, carrying what its lines added up to.
export function copiedItems(lines: KitItem[]): CopiedItem[] {
	const wanted: CopiedItem[] = [];
	for (const line of lines) {
		const known = wanted.find((one) => one.item.id === line.item_type.id);
		if (known) known.quantity += line.quantity;
		else wanted.push({ item: line.item_type, quantity: line.quantity });
	}
	return wanted;
}

export async function copyKit({
	household,
	kit,
	destination,
	move = false,
	progressed,
	stopped
}: {
	household: number;
	kit: number;
	destination: number;
	move?: boolean;
	progressed: (done: number, total: number) => void;
	stopped?: () => boolean;
}): Promise<CopyReport> {
	const source = await readKit(household, kit);
	const wanted = copiedItems(source.items);
	const report: CopyReport = { copied: 0, refused: [], moved: false };
	progressed(0, wanted.length);
	// The only write that stands outside the loop, so the only one the loop's
	// stop discipline does not cover: leaving during the read would otherwise
	// drop an empty kit in the other household and say nothing about it.
	if (stopped?.()) return report;
	const landed = await createKit(destination, source.name, source.description);
	// A created line goes to the top of its kit, and after the merge every object
	// is new to the destination: creating them in the source's order would hand
	// back a kit read upside down.
	const backwards = [...wanted].reverse();
	// Stopping between two objects, never inside one, follows `importItems`.
	for (const [at, one] of backwards.entries()) {
		if (stopped?.()) break;
		try {
			const { item } = await createItemType(destination, one.item.name);
			await createKitItem(destination, landed.id, {
				item_type: item.id,
				person: null,
				quantity: one.quantity
			});
			report.copied += 1;
		} catch (refusal) {
			// Unshifted, because the loop walks the kit backwards and the recap is
			// read against the kit.
			report.refused.unshift({ name: one.item.name, message: said(refusal) });
		}
		progressed(at + 1, backwards.length);
	}
	// The kit only leaves its household once every object has landed in the other
	// one. A refusal, or a stop that cut the loop short, means something did not
	// arrive, and that is precisely what deleting the source would destroy.
	if (move && report.refused.length === 0 && !stopped?.()) {
		await deleteKit(household, kit);
		report.moved = true;
	}
	return report;
}
