import '@testing-library/jest-dom/vitest';
import { screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class SystemPreference extends EventTarget {
	matches = false;
}

const systemPreference = new SystemPreference();
let cleanupToggle: () => void = () => {};

function switchSystemTo(dark: boolean) {
	systemPreference.matches = dark;
	systemPreference.dispatchEvent(new Event('change'));
}

async function renderToggle() {
	vi.resetModules();
	const { render, cleanup } = await import('@testing-library/svelte');
	const { default: ThemeToggle } = await import('./ThemeToggle.svelte');
	cleanupToggle = cleanup;
	render(ThemeToggle);
	return userEvent.setup();
}

const isDark = () => document.documentElement.classList.contains('dark');
const settled = () => new Promise((resolve) => setTimeout(resolve));

describe('ThemeToggle', () => {
	beforeEach(() => {
		vi.stubGlobal('matchMedia', () => systemPreference);
		localStorage.clear();
		document.documentElement.classList.remove('dark');
		systemPreference.matches = false;
	});

	afterEach(() => {
		cleanupToggle();
	});

	it('suit le système tant que rien n’a été choisi', async () => {
		systemPreference.matches = true;
		await renderToggle();

		expect(
			screen.getByRole('button', { name: 'Thème système. Passer au thème clair' })
		).toBeInTheDocument();
		await waitFor(() => expect(isDark()).toBe(true));
	});

	it('suit le système quand celui-ci bascule', async () => {
		await renderToggle();
		await waitFor(() => expect(isDark()).toBe(false));

		switchSystemTo(true);

		await waitFor(() => expect(isDark()).toBe(true));
	});

	it('force le thème clair puis le thème sombre avant de revenir au système', async () => {
		systemPreference.matches = true;
		const user = await renderToggle();

		await user.click(screen.getByRole('button', { name: 'Thème système. Passer au thème clair' }));

		expect(localStorage.getItem('theme')).toBe('light');
		await waitFor(() => expect(isDark()).toBe(false));

		await user.click(screen.getByRole('button', { name: 'Thème clair. Passer au thème sombre' }));

		expect(localStorage.getItem('theme')).toBe('dark');
		await waitFor(() => expect(isDark()).toBe(true));

		await user.click(screen.getByRole('button', { name: 'Thème sombre. Passer au thème système' }));

		expect(localStorage.getItem('theme')).toBeNull();
		expect(
			screen.getByRole('button', { name: 'Thème système. Passer au thème clair' })
		).toBeInTheDocument();
	});

	it('ignore le système quand un thème est forcé', async () => {
		const user = await renderToggle();
		await user.click(screen.getByRole('button', { name: 'Thème système. Passer au thème clair' }));

		switchSystemTo(true);
		await settled();

		expect(isDark()).toBe(false);
	});

	it('repart du choix persisté par le navigateur', async () => {
		localStorage.setItem('theme', 'dark');

		await renderToggle();

		expect(
			screen.getByRole('button', { name: 'Thème sombre. Passer au thème système' })
		).toBeInTheDocument();
		await waitFor(() => expect(isDark()).toBe(true));
	});
});
