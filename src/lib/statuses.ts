import { createItemStatus, type ProgressCategory } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';

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
