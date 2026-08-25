import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class SystemPreference extends EventTarget {
	matches = false;
}

const systemPreference = new SystemPreference();
let cleanupToggle: () => void = () => {};

async function renderToggle() {
	vi.resetModules();
	const { render, cleanup } = await import('@testing-library/svelte');
	const { default: ThemeToggle } = await import('./ThemeToggle.svelte');
	cleanupToggle = cleanup;
	render(ThemeToggle);
	return userEvent.setup();
}

const button = (name: string) => screen.getByRole('button', { name });

describe('ThemeToggle', () => {
	beforeEach(() => {
		vi.stubGlobal('matchMedia', () => systemPreference);
		localStorage.clear();
		systemPreference.matches = false;
	});

	afterEach(() => {
		cleanupToggle();
	});

	it('annonce l’état courant et ce que le clic va faire', async () => {
		await renderToggle();

		expect(button('Thème système. Passer au thème clair')).toBeInTheDocument();
	});

	it('force le thème clair puis le thème sombre avant de revenir au système', async () => {
		const user = await renderToggle();

		await user.click(button('Thème système. Passer au thème clair'));
		expect(localStorage.getItem('theme')).toBe('light');

		await user.click(button('Thème clair. Passer au thème sombre'));
		expect(localStorage.getItem('theme')).toBe('dark');

		await user.click(button('Thème sombre. Passer au thème système'));
		expect(localStorage.getItem('theme')).toBeNull();
		expect(button('Thème système. Passer au thème clair')).toBeInTheDocument();
	});

	it('repart du choix persisté par le navigateur', async () => {
		localStorage.setItem('theme', 'dark');

		await renderToggle();

		expect(button('Thème sombre. Passer au thème système')).toBeInTheDocument();
	});
});
