import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdPeople from './HouseholdPeople.svelte';
import {
	ApiError,
	createPerson,
	deletePerson,
	removeMember,
	setMemberRole,
	type Member,
	type Person
} from '$lib/api.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createPerson: vi.fn(),
	renamePerson: vi.fn(),
	deletePerson: vi.fn(),
	removeMember: vi.fn(),
	setMemberRole: vi.fn(),
	deleteHousehold: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const household = { id: 7, name: 'Famille Martin', personal: false };
const me = { id: 1, display: 'camille', email: 'camille@example.com', has_usable_password: true };

const camille: Person = { id: 10, name: 'Camille', user: 1 };
const child: Person = { id: 11, name: 'Léo', user: null };
const sacha: Person = { id: 12, name: 'Sacha', user: 2 };

const owner: Member = { id: 100, user: 1, email: 'camille@example.com', role: 'owner' };
const member: Member = { id: 101, user: 2, email: 'sacha@example.com', role: 'member' };
const newcomer: Member = { id: 102, user: 3, email: 'alix@example.com', role: 'member' };

function mount(
	persons: Person[] = [camille, child],
	members: Member[] = [owner],
	isOwner = true,
	onchanged = vi.fn()
) {
	render(HouseholdPeople, { props: { household, persons, members, owner: isOwner, onchanged } });
	return onchanged;
}

async function sheet() {
	const opened = await screen.findByRole('dialog');
	await waitFor(() => expect(opened.contains(document.activeElement)).toBe(true));
	return opened;
}

function menu() {
	return screen.getByRole('menu');
}

async function openActions(user: UserEvent, name: string) {
	await user.click(screen.getByRole('button', { name: `Actions sur ${name}` }));
}

describe('HouseholdPeople', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		session.user = me;
	});

	it('montre le compte d’une personne qui en a un, et le silence de celle qui n’en a pas', () => {
		mount();

		const [first, second] = within(screen.getByTestId('persons')).getAllByRole('listitem');
		expect(within(first).getByText('camille@example.com')).toBeInTheDocument();
		expect(within(first).getByText('propriétaire')).toBeInTheDocument();
		expect(within(second).getByText('sans compte')).toBeInTheDocument();
	});

	it('tient le membre qui n’est encore personne au bas de la liste, sous son adresse', () => {
		mount([camille], [owner, newcomer]);

		const rows = within(screen.getByTestId('persons')).getAllByRole('listitem');
		expect(within(rows[rows.length - 1]).getByText('alix@example.com')).toBeVisible();
		expect(within(rows[rows.length - 1]).getByText('n’est encore personne ici')).toBeVisible();
	});

	it('ajoute une personne et prévient son parent', async () => {
		const user = userEvent.setup();
		vi.mocked(createPerson).mockResolvedValue({ id: 13, name: 'Mamie', user: null });
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Ajouter une personne' }));
		await user.type(within(await sheet()).getByLabelText('Nom de la personne'), 'Mamie');
		await user.click(within(await sheet()).getByRole('button', { name: 'Ajouter' }));

		expect(createPerson).toHaveBeenCalledWith(7, 'Mamie');
		expect(onchanged).toHaveBeenCalled();
	});

	it('relaie ce que l’API reproche à une valeur, au lieu de parler de panne', async () => {
		const user = userEvent.setup();
		vi.mocked(createPerson).mockRejectedValue(
			new ApiError(400, { name: ['Ensure this field has no more than 100 characters.'] }, 'bad')
		);
		mount();

		await user.click(screen.getByRole('button', { name: 'Ajouter une personne' }));
		await user.type(within(await sheet()).getByLabelText('Nom de la personne'), 'x');
		await user.click(within(await sheet()).getByRole('button', { name: 'Ajouter' }));

		expect(
			await screen.findByText('Ensure this field has no more than 100 characters.')
		).toBeInTheDocument();
		expect(screen.queryByText('L’API est injoignable.')).not.toBeInTheDocument();
	});

	it('dit l’ordre du retrait avant de laisser l’API le refuser', async () => {
		const user = userEvent.setup();
		vi.mocked(deletePerson).mockRejectedValue(
			new ApiError(
				409,
				{ detail: 'A person whose account is still a member cannot be deleted.' },
				'conflict'
			)
		);
		mount([camille, sacha], [owner, member]);

		await openActions(user, 'Sacha');
		await user.click(within(menu()).getByRole('menuitem', { name: 'Retirer du foyer' }));

		expect(within(await sheet()).getByTestId('removal-order')).toBeVisible();
		await user.click(within(await sheet()).getByRole('button', { name: 'Retirer du foyer' }));

		expect(
			await screen.findByText('A person whose account is still a member cannot be deleted.')
		).toBeInTheDocument();
	});

	it('rappelle le sort des lignes de voyage avant de retirer une personne sans compte', async () => {
		const user = userEvent.setup();
		vi.mocked(deletePerson).mockResolvedValue(undefined);
		const onchanged = mount();

		await openActions(user, 'Léo');
		await user.click(within(menu()).getByRole('menuitem', { name: 'Retirer du foyer' }));

		expect(within(await sheet()).getByText(/deviennent communes au voyage/)).toBeVisible();
		expect(within(await sheet()).queryByTestId('removal-order')).not.toBeInTheDocument();

		await user.click(within(await sheet()).getByRole('button', { name: 'Retirer du foyer' }));

		expect(deletePerson).toHaveBeenCalledWith(7, 11);
		expect(onchanged).toHaveBeenCalled();
	});

	it('nomme propriétaire un autre membre, et jamais soi-même', async () => {
		const user = userEvent.setup();
		vi.mocked(setMemberRole).mockResolvedValue({ ...member, role: 'owner' });
		mount([camille, sacha], [owner, member]);

		await openActions(user, 'Camille');
		expect(within(menu()).queryByRole('menuitem', { name: 'Rétrograder en membre' })).toBeNull();
		expect(within(menu()).queryByRole('menuitem', { name: 'Nommer propriétaire' })).toBeNull();

		await openActions(user, 'Sacha');
		await user.click(within(menu()).getByRole('menuitem', { name: 'Nommer propriétaire' }));

		expect(setMemberRole).toHaveBeenCalledWith(7, 101, 'owner');
	});

	it('garde les rôles et le retrait d’un autre pour les propriétaires', async () => {
		const user = userEvent.setup();
		session.user = { ...me, id: 2 };
		mount([camille, sacha], [owner, member], false);

		await openActions(user, 'Camille');

		expect(within(menu()).queryByRole('menuitem', { name: 'Nommer propriétaire' })).toBeNull();
		expect(
			within(menu()).queryByRole('menuitem', { name: 'Retirer son compte du foyer' })
		).toBeNull();
		expect(within(menu()).getByRole('menuitem', { name: 'Renommer' })).toBeVisible();
	});

	it('n’offre pas de quitter au dernier propriétaire, ni au dernier membre', async () => {
		const user = userEvent.setup();
		mount([camille, sacha], [owner, member]);

		await openActions(user, 'Camille');

		expect(within(menu()).queryByRole('menuitem', { name: 'Quitter ce foyer' })).toBeNull();
		expect(within(menu()).queryByRole('menuitem', { name: 'Supprimer ce foyer' })).toBeNull();
	});

	it('offre au dernier membre de supprimer le foyer plutôt que de le quitter', async () => {
		const user = userEvent.setup();
		mount([camille], [owner]);

		await openActions(user, 'Camille');

		expect(within(menu()).queryByRole('menuitem', { name: 'Quitter ce foyer' })).toBeNull();
		expect(within(menu()).getByRole('menuitem', { name: 'Supprimer ce foyer' })).toBeVisible();
	});

	it('laisse partir un membre qui laisse un propriétaire derrière lui', async () => {
		const user = userEvent.setup();
		vi.mocked(removeMember).mockResolvedValue(undefined);
		session.user = { ...me, id: 2 };
		mount([camille, sacha], [owner, member], false);

		await openActions(user, 'Sacha');
		await user.click(within(menu()).getByRole('menuitem', { name: 'Quitter ce foyer' }));
		await user.click(within(await sheet()).getByRole('button', { name: 'Quitter ce foyer' }));

		expect(removeMember).toHaveBeenCalledWith(7, 101);
	});

	it('ne laisse retirer un arrivant qu’à un propriétaire', async () => {
		const user = userEvent.setup();
		vi.mocked(removeMember).mockResolvedValue(undefined);
		mount([camille], [owner, newcomer]);

		await openActions(user, 'alix@example.com');
		await user.click(within(menu()).getByRole('menuitem', { name: 'Retirer du foyer' }));

		expect(removeMember).toHaveBeenCalledWith(7, 102);
	});

	it('ne fait pas de l’arrivant un bouton pour un membre ordinaire', () => {
		session.user = { ...me, id: 2 };
		mount([camille, sacha], [owner, member, newcomer], false);

		expect(screen.queryByRole('button', { name: /alix@example\.com/ })).toBeNull();
		expect(screen.getByText('alix@example.com')).toBeVisible();
	});
});
