export const PULL_THRESHOLD = 64;
export const PULL_CEILING = 96;
export const REFRESH_FLOOR = 550;
export const REFRESH_SETTLED = 900;

// The finger travels further than the indicator, so the pull feels resisted and
// the threshold cannot be crossed by a stray swipe.
export function pulled(travel: number): number {
	return Math.min(Math.max(travel, 0) / 2, PULL_CEILING);
}

// The screen already polls every three seconds, so the refetch almost always
// answers within a frame: without a floor the indicator appears and vanishes
// too fast to be read, and the gesture looks like it did nothing. The floor
// holds it long enough to be seen, whether it ends on a tick or on a cross.
export async function atLeast<T>(work: () => Promise<T>, floor = REFRESH_FLOOR): Promise<T> {
	const [outcome] = await Promise.allSettled([
		work(),
		new Promise((done) => setTimeout(done, floor))
	]);
	if (outcome.status === 'rejected') throw outcome.reason;
	return outcome.value;
}
