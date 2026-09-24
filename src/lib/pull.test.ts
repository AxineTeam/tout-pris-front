import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { atLeast, PULL_CEILING, PULL_THRESHOLD, pulled } from './pull.js';

describe('pulled', () => {
	it('stays at zero while the finger goes up', () => {
		expect(pulled(-40)).toBe(0);
	});

	it('resists, so the threshold needs more travel than it measures', () => {
		expect(pulled(PULL_THRESHOLD)).toBeLessThan(PULL_THRESHOLD);
		expect(pulled(PULL_THRESHOLD * 2)).toBe(PULL_THRESHOLD);
	});

	it('stops at the ceiling', () => {
		expect(pulled(10_000)).toBe(PULL_CEILING);
	});
});

describe('atLeast', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('holds an instant success until the floor', async () => {
		const settled = vi.fn();
		const held = atLeast(() => Promise.resolve('fresh'), 500).then(settled);

		await vi.advanceTimersByTimeAsync(499);
		expect(settled).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		await held;
		expect(settled).toHaveBeenCalledWith('fresh');
	});

	it('holds an instant failure until the floor, then rethrows', async () => {
		const caught = vi.fn();
		const held = atLeast(() => Promise.reject(new Error('offline')), 500).catch(caught);

		await vi.advanceTimersByTimeAsync(499);
		expect(caught).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		await held;
		expect(caught).toHaveBeenCalledWith(new Error('offline'));
	});

	it('waits for work slower than the floor', async () => {
		const settled = vi.fn();
		const slow = new Promise<string>((done) => setTimeout(() => done('late'), 900));
		const held = atLeast(() => slow, 500).then(settled);

		await vi.advanceTimersByTimeAsync(500);
		expect(settled).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(400);
		await held;
		expect(settled).toHaveBeenCalledWith('late');
	});
});
