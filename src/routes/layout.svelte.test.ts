import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class SystemPreference extends EventTarget {
	matches = false;
}

const systemPreference = new SystemPreference();
let cleanupLayout: () => void = () => {};

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

vi.mock('$lib/build.js', () => ({
	build: { version: 'test', commit: 'abcdef0' },
	apiBuild: () => new Promise(() => {})
}));

function switchSystemTo(dark: boolean) {
	systemPreference.matches = dark;
	systemPreference.dispatchEvent(new Event('change'));
}

async function renderLayout() {
	vi.resetModules();
	const { render, cleanup } = await import('@testing-library/svelte');
	const { createRawSnippet } = await import('svelte');
	const { default: Layout } = await import('./+layout.svelte');
	cleanupLayout = cleanup;
	render(Layout, {
		props: { children: createRawSnippet(() => ({ render: () => '<p>page</p>' })) }
	});
	return userEvent.setup();
}

const isDark = () => document.documentElement.classList.contains('dark');
const settled = () => new Promise((resolve) => setTimeout(resolve));

describe('+layout', () => {
	beforeEach(() => {
		vi.stubGlobal('matchMedia', () => systemPreference);
		localStorage.clear();
		document.documentElement.classList.remove('dark');
		systemPreference.matches = false;
	});

	afterEach(() => {
		cleanupLayout();
	});

	it('peint le document selon le système tant que rien n’a été choisi', async () => {
		systemPreference.matches = true;

		await renderLayout();

		await waitFor(() => expect(isDark()).toBe(true));
	});

	it('repeint quand le système bascule', async () => {
		await renderLayout();
		await waitFor(() => expect(isDark()).toBe(false));

		switchSystemTo(true);

		await waitFor(() => expect(isDark()).toBe(true));
	});

	it('ignore le système quand un thème est forcé', async () => {
		const user = await renderLayout();

		await user.click(screen.getByRole('button', { name: 'Thème système. Passer au thème clair' }));

		switchSystemTo(true);
		await settled();

		expect(isDark()).toBe(false);
	});

	it('peint le choix persisté avant toute interaction', async () => {
		localStorage.setItem('theme', 'dark');

		await renderLayout();

		await waitFor(() => expect(isDark()).toBe(true));
	});
});
