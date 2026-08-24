import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdSettings from './HouseholdSettings.svelte';
import { renameHousehold, type Member } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	renameHousehold: vi.fn(),
	deleteHousehold: vi.fn(),
	removeMember: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const household = { id: 7, name: 'Famille Martin', personal: false };
const me = { id: 1, display: 'camille', email: 'camille@example.com', has_usable_password: true };

const owner: Member = { id: 100, user: 1, email: 'camille@example.com', role: 'owner' };
const second: Member = { id: 101, user: 2, email: 'dominique@example.com', role: 'owner' };
const guest: Member = { id: 102, user: 3, email: 'sacha@example.com', role: 'member' };

function mount(members = [owner, second], onchanged = vi.fn()) {
	render(HouseholdSettings, { props: { household, members, onchanged } });
	return onchanged;
}

describe('HouseholdSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		session.user = me;
		households.all = [household];
	});

	it('supprime plutôt que quitte quand on est le seul membre', () => {
		mount([owner]);

		expect(screen.getByTestId('alone')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Quitter ce foyer' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Supprimer ce foyer' })).toBeInTheDocument();
	});

	it('retient le dernier propriétaire qui voudrait partir', () => {
		mount([owner, guest]);

		expect(screen.getByRole('button', { name: 'Quitter ce foyer' })).toBeDisabled();
		expect(screen.getByTestId('last-owner')).toBeInTheDocument();
	});

	it('laisse partir un propriétaire qui en laisse un autre derrière lui', () => {
		mount();

		expect(screen.getByRole('button', { name: 'Quitter ce foyer' })).toBeEnabled();
		expect(screen.queryByTestId('last-owner')).not.toBeInTheDocument();
	});

	it('réserve le renommage et la suppression aux propriétaires', () => {
		session.user = { ...me, id: 3 };
		mount([owner, guest]);

		expect(screen.queryByLabelText('Nom du foyer')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Supprimer ce foyer' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Quitter ce foyer' })).toBeEnabled();
	});

	it('renomme le foyer et met le sélecteur à jour', async () => {
		const user = userEvent.setup();
		vi.mocked(renameHousehold).mockResolvedValue({ ...household, name: 'Chez nous' });
		const onchanged = mount();

		const name = screen.getByLabelText('Nom du foyer');
		await user.clear(name);
		await user.type(name, 'Chez nous');
		await user.click(screen.getByRole('button', { name: 'Renommer' }));

		expect(renameHousehold).toHaveBeenCalledWith(7, 'Chez nous');
		expect(households.all[0].name).toBe('Chez nous');
		expect(onchanged).toHaveBeenCalled();
	});
});
