import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class SystemPreference extends EventTarget {
	matches = false;
}

const systemPreference = new SystemPreference();
let cleanupChoice: () => void = () => {};

async function renderChoice() {
	vi.resetModules();
	const { render, cleanup } = await import('@testing-library/svelte');
	const { default: ThemeChoice } = await import('./ThemeChoice.svelte');
	cleanupChoice = cleanup;
	render(ThemeChoice);
	return userEvent.setup();
}

const button = (name: string) => screen.getByRole('button', { name });

describe('ThemeChoice', () => {
	beforeEach(() => {
		vi.stubGlobal('matchMedia', () => systemPreference);
		localStorage.clear();
		systemPreference.matches = false;
	});

	afterEach(() => {
		cleanupChoice();
	});

	it('montre les trois thèmes dans un groupe nommé', async () => {
		await renderChoice();

		const group = screen.getByRole('group', { name: 'Choix du thème' });

		expect(group).toContainElement(button('Système'));
		expect(group).toContainElement(button('Clair'));
		expect(group).toContainElement(button('Sombre'));
	});

	it('marque le thème courant et lui seul', async () => {
		await renderChoice();

		expect(button('Système')).toHaveAttribute('aria-pressed', 'true');
		expect(button('Clair')).toHaveAttribute('aria-pressed', 'false');
		expect(button('Sombre')).toHaveAttribute('aria-pressed', 'false');
	});

	it('atteint chaque thème en un clic, sans passer par les autres', async () => {
		const user = await renderChoice();

		await user.click(button('Sombre'));
		expect(localStorage.getItem('theme')).toBe('dark');
		expect(button('Sombre')).toHaveAttribute('aria-pressed', 'true');

		await user.click(button('Clair'));
		expect(localStorage.getItem('theme')).toBe('light');

		await user.click(button('Système'));
		expect(localStorage.getItem('theme')).toBeNull();
		expect(button('Système')).toHaveAttribute('aria-pressed', 'true');
	});

	it('repart du choix persisté par le navigateur', async () => {
		localStorage.setItem('theme', 'dark');

		await renderChoice();

		expect(button('Sombre')).toHaveAttribute('aria-pressed', 'true');
	});
});
