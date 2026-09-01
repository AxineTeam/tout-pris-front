import { createItemStatus, type ItemStatus, type ProgressCategory } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';
import { Reordering } from '$lib/reorder.svelte.js';

export const PROGRESS_ORDER: ProgressCategory[] = ['not_started', 'in_progress', 'done'];

// The hierarchy a reader sees is the three sections, not the household's raw
// ranks: a status added to an early section takes the last position of the
// whole household, so `position` alone puts it behind sections it comes before.
// It only settles ties inside one section.
export function inHierarchy(statuses: ItemStatus[]): ItemStatus[] {
	return [...statuses].sort(
		(one, other) =>
			PROGRESS_ORDER.indexOf(one.progress) - PROGRESS_ORDER.indexOf(other.progress) ||
			one.position - other.position
	);
}

export class SectionedReordering extends Reordering<ItemStatus> {
	#sectionUnder(y: number): ProgressCategory {
		let nearest = PROGRESS_ORDER[0];
		let shortest = Infinity;
		for (const progress of PROGRESS_ORDER) {
			const box = this.boxOf(`[data-section="${progress}"]`);
			if (!box) continue;
			if (y >= box.top && y <= box.bottom) return progress;
			const gap = y < box.top ? box.top - y : y - box.bottom;
			if (gap < shortest) {
				shortest = gap;
				nearest = progress;
			}
		}
		return nearest;
	}

	protected override landing(moved: ItemStatus, y: number): ItemStatus[] {
		const progress = this.#sectionUnder(y);
		const rest = this.rows.filter((status) => status.id !== moved.id);
		const section = rest.filter((status) => status.progress === progress);
		const above = section.filter((status) => this.passed(status, y)).length;
		const at =
			above < section.length
				? rest.indexOf(section[above])
				: section.length > 0
					? rest.indexOf(section[above - 1]) + 1
					: rest.length;
		return [...rest.slice(0, at), { ...moved, progress }, ...rest.slice(at)];
	}
}

const tokens: Record<ProgressCategory, string> = {
	not_started: '--status-not-started',
	in_progress: '--status-in-progress',
	done: '--status-done'
};

const fallback = '#7b8189';

export function suggestedColor(progress: ProgressCategory): string {
	const declared = getComputedStyle(document.documentElement)
		.getPropertyValue(tokens[progress])
		.trim();
	return /^#[0-9a-f]{6}$/i.test(declared) ? declared : fallback;
}

function baseStatuses(): { name: string; progress: ProgressCategory }[] {
	return [
		{ name: m.status_base_not_started(), progress: 'not_started' },
		{ name: m.status_base_in_progress(), progress: 'in_progress' },
		{ name: m.status_base_done(), progress: 'done' }
	];
}

export async function installBaseStatuses(household: number): Promise<void> {
	for (const { name, progress } of baseStatuses()) {
		await createItemStatus(household, name, suggestedColor(progress), progress);
	}
}
