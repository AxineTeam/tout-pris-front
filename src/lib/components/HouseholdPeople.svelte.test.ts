import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdPeople from './HouseholdPeople.svelte';
import { ApiError, claimPerson, createPerson, deletePerson, type Member } from '$lib/api.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createPerson: vi.fn(),
	renamePerson: vi.fn(),
	deletePerson: vi.fn(),
	claimPerson: vi.fn(),
	removeMember: vi.fn(),
	setMemberRole: vi.fn()
}));

const household = { id: 7, name: 'Famille Martin', personal: false };
const me = { id: 1, display: 'camille', email: 'camille@example.com', has_usable_password: true };

const camille = { id: 10, name: 'Camille', user: 1 };
const child = { id: 11, name: 'Léo', user: null };
const owner: Member = { id: 100, user: 1, email: 'camille@example.com', role: 'owner' };

function mount(persons = [camille, child], members = [owner], onchanged = vi.fn()) {
	render(HouseholdPeople, { props: { household, persons, members, onchanged } });
	return onchanged;
}

describe('HouseholdPeople', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		session.user = me;
	});

	it('montre le compte d’une personne qui en a un, et le silence de celle qui n’en a pas', () => {
		mount();

		const [first, second] = screen.getAllByRole('listitem');
		expect(within(first).getByText('camille@example.com')).toBeInTheDocument();
		expect(within(first).getByText('propriétaire')).toBeInTheDocument();
		expect(within(second).getByText('sans compte')).toBeInTheDocument();
		expect(within(second).queryByText('propriétaire')).not.toBeInTheDocument();
	});

	it('relaie le refus de supprimer une personne dont le compte est encore membre', async () => {
		const user = userEvent.setup();
		vi.mocked(deletePerson).mockRejectedValue(
			new ApiError(
				409,
				{ detail: 'A person whose account is still a member cannot be deleted.' },
				'conflict'
			)
		);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Supprimer Camille' }));

		expect(
			await screen.findByText('A person whose account is still a member cannot be deleted.')
		).toBeInTheDocument();
		expect(onchanged).not.toHaveBeenCalled();
	});

	it('relaie ce que l’API reproche à une valeur, au lieu de parler de panne', async () => {
		const user = userEvent.setup();
		vi.mocked(createPerson).mockRejectedValue(
			new ApiError(
				400,
				{ name: ['Ensure this field has no more than 100 characters.'] },
				'bad request'
			)
		);
		mount();

		await user.type(screen.getByLabelText('Ajouter une personne'), 'x'.repeat(101));
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(
			await screen.findByText('Ensure this field has no more than 100 characters.')
		).toBeInTheDocument();
		expect(screen.queryByText('L’API est injoignable.')).not.toBeInTheDocument();
	});

	it('ajoute une personne et prévient son parent', async () => {
		const user = userEvent.setup();
		vi.mocked(createPerson).mockResolvedValue({ id: 12, name: 'Nina', user: null });
		const onchanged = mount();

		await user.type(screen.getByLabelText('Ajouter une personne'), 'Nina');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(createPerson).toHaveBeenCalledWith(7, 'Nina');
		expect(onchanged).toHaveBeenCalled();
	});

	it('propose de choisir qui je suis quand je suis membre sans personne', async () => {
		const user = userEvent.setup();
		vi.mocked(claimPerson).mockResolvedValue(undefined);
		const guest: Member = { id: 101, user: 2, email: 'dominique@example.com', role: 'member' };
		session.user = { ...me, id: 2 };
		mount([child], [owner, guest]);

		expect(screen.getByTestId('claim-invite')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Je suis Léo' }));

		expect(claimPerson).toHaveBeenCalledWith(7, 11);
	});

	it('ne propose ce choix qu’à qui n’est encore personne', () => {
		mount();

		expect(screen.queryByTestId('claim-invite')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Je suis Léo' })).not.toBeInTheDocument();
	});

	it('garde les actions de propriétaire pour les propriétaires', () => {
		const other: Member = { id: 101, user: 2, email: 'dominique@example.com', role: 'member' };
		const dominique = { id: 12, name: 'Dominique', user: 2 };
		session.user = { ...me, id: 2 };
		mount([camille, dominique], [owner, other]);

		expect(
			screen.queryByRole('button', { name: 'Retirer le compte de Camille' })
		).not.toBeInTheDocument();
	});

	it('nomme les membres qui ne sont encore personne', () => {
		const guest: Member = { id: 101, user: 2, email: 'dominique@example.com', role: 'member' };
		mount([camille], [owner, guest]);

		expect(
			within(screen.getByTestId('strangers')).getByText('dominique@example.com')
		).toBeVisible();
	});
});
