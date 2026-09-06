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

// A person belongs to one household and has no counterpart in another, so every
// copied line lands common: the three lines an object holds here would become
// three identical ones there, which `KitItem` has no unique constraint to
// refuse.
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
	// The only write outside the loop, so the only one its stop check does not
	// cover: leaving during the read would drop an empty kit in the other
	// household.
	if (stopped?.()) return report;
	const landed = await createKit(destination, source.name, source.description);
	// A created line goes to the top of its kit and every object is new to the
	// destination, so creating them in the source's order would hand back a kit
	// read upside down.
	const backwards = [...wanted].reverse();
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
			// Unshifted: the loop walks the kit backwards and the recap is read in
			// the kit's order.
			report.refused.unshift({ name: one.item.name, message: said(refusal) });
		}
		progressed(at + 1, backwards.length);
	}
	const nothingRefusedNorStopped = () => report.refused.length === 0 && !stopped?.();
	if (move && nothingRefusedNorStopped()) {
		await deleteKit(household, kit);
		report.moved = true;
	}
	return report;
}
