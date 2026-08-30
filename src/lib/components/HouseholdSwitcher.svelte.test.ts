import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
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

function menu() {
	return screen.getByRole('menu');
}

async function unfold(user: UserEvent) {
	await user.click(screen.getByRole('button', { name: 'Changer de foyer' }));
}

describe('HouseholdSwitcher', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		households.all = [personal];
	});

	it('porte le foyer courant sur sa pastille, replié', () => {
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		expect(screen.getByTestId('household-switcher')).toHaveTextContent('Personnel');
		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('écrit « Personnel » plutôt que le nom du foyer personnel', async () => {
		const user = userEvent.setup();
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		await unfold(user);

		expect(within(menu()).getByRole('menuitem', { name: 'Personnel' })).toBeInTheDocument();
		expect(within(menu()).queryByRole('menuitem', { name: 'camille' })).toBeNull();
	});

	it('affiche le nom des foyers partagés', async () => {
		const user = userEvent.setup();
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		await unfold(user);

		expect(within(menu()).getByRole('menuitem', { name: 'Famille Martin' })).toHaveAttribute(
			'href',
			'/households/2'
		);
	});

	it('coche le foyer courant', async () => {
		const user = userEvent.setup();
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: shared } });

		await unfold(user);

		expect(within(menu()).getByRole('menuitem', { name: 'Famille Martin' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(within(menu()).getByRole('menuitem', { name: 'Personnel' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('crée un foyer partagé et l’ajoute au sélecteur', async () => {
		const user = userEvent.setup();
		vi.mocked(createHousehold).mockResolvedValue(shared);
		render(HouseholdSwitcher, { props: { all: [personal], current: personal } });

		await unfold(user);
		await user.click(within(menu()).getByRole('menuitem', { name: 'Nouveau foyer' }));

		const sheet = screen.getByRole('dialog');
		await user.type(within(sheet).getByLabelText('Nom du nouveau foyer'), 'Famille Martin');
		await user.click(within(sheet).getByRole('button', { name: 'Créer' }));

		expect(createHousehold).toHaveBeenCalledWith('Famille Martin');
		expect(households.all).toContain(shared);
	});

	it('se replie quand on clique ailleurs', async () => {
		const user = userEvent.setup();
		render(HouseholdSwitcher, { props: { all: [personal, shared], current: personal } });

		await unfold(user);
		expect(screen.getByRole('menu')).toBeVisible();

		await user.click(document.body);

		expect(screen.queryByRole('menu')).toBeNull();
	});
});
