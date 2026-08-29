import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BottomNav from './BottomNav.svelte';

const location = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('$app/state', () => ({ page: { url: location } }));

function show(pathname: string, household: number | undefined) {
	location.pathname = pathname;
	render(BottomNav, { props: { household } });
}

const tab = (name: string) => screen.getByRole('link', { name });

describe('BottomNav', () => {
	it('porte le foyer dans le lien des trois onglets qui en ont besoin', () => {
		show('/households/7', 7);

		expect(tab('Voyages')).toHaveAttribute('href', '/households/7/trips');
		expect(tab('Kits')).toHaveAttribute('href', '/households/7/kits');
		expect(tab('Foyer')).toHaveAttribute('href', '/households/7');
		expect(tab('Profil')).toHaveAttribute('href', '/me');
	});

	it('allume l’onglet Foyer sur l’écran du foyer', () => {
		show('/households/7', 7);

		expect(tab('Foyer')).toHaveAttribute('aria-current', 'page');
		expect(tab('Voyages')).not.toHaveAttribute('aria-current');
	});

	it('allume l’onglet Voyages sur le détail d’un voyage', () => {
		show('/households/7/trips/3', 7);

		expect(tab('Voyages')).toHaveAttribute('aria-current', 'page');
		expect(tab('Foyer')).not.toHaveAttribute('aria-current');
	});

	it('allume l’onglet Kits sur le détail d’un kit', () => {
		show('/households/7/kits/3', 7);

		expect(tab('Kits')).toHaveAttribute('aria-current', 'page');
		expect(tab('Foyer')).not.toHaveAttribute('aria-current');
	});

	it('allume l’onglet Profil sur l’écran du compte', () => {
		show('/me', 7);

		expect(tab('Profil')).toHaveAttribute('aria-current', 'page');
		expect(tab('Foyer')).not.toHaveAttribute('aria-current');
	});

	it('mène à la création quand le compte n’a encore aucun foyer', () => {
		show('/households/new', undefined);

		expect(tab('Foyer')).toHaveAttribute('href', '/households/new');
		expect(tab('Foyer')).toHaveAttribute('aria-current', 'page');
		expect(screen.queryByRole('link', { name: 'Voyages' })).not.toBeInTheDocument();
		expect(screen.getByText('Voyages').parentElement).toHaveAttribute('aria-disabled', 'true');
	});
});
