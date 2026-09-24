import { beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
	vi.resetModules();
	const { confirmations } = await import('./confirmations.svelte.js');
	return confirmations;
}

describe('confirmations', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('demande confirmation tant que rien n’a été tu', async () => {
		const confirmations = await load();

		expect(confirmations.asks('trip-line')).toBe(true);
		expect(confirmations.asks('kit-line')).toBe(true);
		expect(confirmations.anySilenced).toBe(false);
	});

	it('ne tait que le type de confirmation visé', async () => {
		const confirmations = await load();

		confirmations.silence('trip-line');

		expect(confirmations.asks('trip-line')).toBe(false);
		expect(confirmations.asks('kit-line')).toBe(true);
		expect(confirmations.anySilenced).toBe(true);
	});

	it('retrouve au chargement suivant ce qui a été tu', async () => {
		(await load()).silence('kit-line');

		const reloaded = await load();

		expect(reloaded.asks('kit-line')).toBe(false);
		expect(reloaded.asks('trip-line')).toBe(true);
	});

	it('remet toutes les confirmations, et pour de bon', async () => {
		const confirmations = await load();
		confirmations.silence('trip-line');
		confirmations.silence('kit-line');

		confirmations.askAgain();

		expect(confirmations.anySilenced).toBe(false);
		const reloaded = await load();
		expect(reloaded.asks('trip-line')).toBe(true);
		expect(reloaded.asks('kit-line')).toBe(true);
	});
});
