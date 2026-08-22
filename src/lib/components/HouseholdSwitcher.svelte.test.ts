import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import HouseholdSwitcher from './HouseholdSwitcher.svelte';

const personal = { id: 1, name: 'camille', personal: true };
const shared = { id: 2, name: 'Famille Martin', personal: false };

describe('HouseholdSwitcher', () => {
	it('écrit « Personnel » plutôt que le nom du foyer personnel', () => {
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		expect(screen.getByRole('link', { name: 'Personnel' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'camille' })).not.toBeInTheDocument();
	});

	it('affiche le nom des foyers partagés', () => {
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		expect(screen.getByRole('link', { name: 'Famille Martin' })).toHaveAttribute(
			'href',
			'/households/2'
		);
	});

	it('marque le foyer courant', () => {
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: shared } });

		expect(screen.getByRole('link', { name: 'Famille Martin' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByRole('link', { name: 'Personnel' })).not.toHaveAttribute('aria-current');
	});
});
