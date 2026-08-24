import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdSwitcher from './HouseholdSwitcher.svelte';
import { createHousehold } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createHousehold: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const personal = { id: 1, name: 'camille', personal: true };
const shared = { id: 2, name: 'Famille Martin', personal: false };

describe('HouseholdSwitcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		households.all = [personal];
	});

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

	it('crée un foyer partagé et l’ajoute au sélecteur', async () => {
		const user = userEvent.setup();
		vi.mocked(createHousehold).mockResolvedValue(shared);
		render(HouseholdSwitcher, { props: { all: [personal], current: personal } });

		await user.click(screen.getByRole('button', { name: 'Nouveau foyer' }));
		await user.type(screen.getByLabelText('Nom du nouveau foyer'), 'Famille Martin');
		await user.click(screen.getByRole('button', { name: 'Créer' }));

		expect(createHousehold).toHaveBeenCalledWith('Famille Martin');
		expect(households.all).toContain(shared);
	});
});
