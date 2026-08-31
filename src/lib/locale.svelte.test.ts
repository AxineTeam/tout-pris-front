import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { locale } from './locale.svelte.js';

describe('locale.until', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 12, 9, 30));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([
		['2026-08-12', 'aujourd’hui'],
		['2026-08-13', 'demain'],
		['2026-08-19', 'dans 7 jours'],
		['2026-09-11', 'dans 30 jours'],
		['2026-09-12', 'dans 1 mois'],
		['2026-11-12', 'dans 3 mois'],
		['2027-08-12', 'dans 12 mois'],
		['2027-09-12', 'dans 1 an'],
		['2028-08-12', 'dans 2 ans'],
		['2026-08-11', 'hier'],
		['2026-08-05', 'il y a 7 jours'],
		['2026-07-13', 'il y a 30 jours'],
		['2026-07-12', 'il y a 1 mois'],
		['2026-05-12', 'il y a 3 mois'],
		['2025-08-12', 'il y a 12 mois'],
		['2025-07-12', 'il y a 1 an'],
		['2024-08-12', 'il y a 2 ans']
	])('lit %s comme « %s » depuis le 12 août 2026', (day, expected) => {
		expect(locale.until(day)).toBe(expected);
	});
});
