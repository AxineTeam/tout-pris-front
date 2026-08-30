import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdStatuses from './HouseholdStatuses.svelte';
import {
	ApiError,
	createItemStatus,
	deleteItemStatus,
	updateItemStatus,
	type ItemStatus
} from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createItemStatus: vi.fn(),
	updateItemStatus: vi.fn(),
	deleteItemStatus: vi.fn()
}));

const notStarted: ItemStatus = {
	id: 1,
	name: 'Pas préparé',
	color: '#7b8189',
	progress: 'not_started',
	position: 0,
	is_default: true
};

const inProgress: ItemStatus = {
	id: 2,
	name: 'Sorti du placard',
	color: '#dcb14f',
	progress: 'in_progress',
	position: 1,
	is_default: false
};

const done: ItemStatus = {
	id: 3,
	name: 'Dans les sacs',
	color: '#5c8a66',
	progress: 'done',
	position: 2,
	is_default: false
};

function sheet() {
	return screen.getByRole('dialog');
}

function mount(statuses = [notStarted, inProgress, done], onchanged = vi.fn()) {
	render(HouseholdStatuses, { props: { household: 7, statuses, onchanged } });
	return onchanged;
}

async function addIn(user: UserEvent, group: string) {
	await user.click(
		within(screen.getByTestId(`status-group-${group}`)).getByRole('button', {
			name: 'Ajouter un statut'
		})
	);
}

describe('HouseholdStatuses', () => {
	beforeEach(() => vi.clearAllMocks());

	it('range chaque statut sous la section qui compte pour lui', () => {
		mount();

		expect(screen.getByTestId('status-group-not_started')).toHaveTextContent('Pas préparé');
		expect(screen.getByTestId('status-group-in_progress')).toHaveTextContent('Sorti du placard');
		expect(screen.getByTestId('status-group-done')).toHaveTextContent('Dans les sacs');
	});

	it('désigne le statut par défaut et ne propose pas de le supprimer', () => {
		mount();

		expect(screen.getByTestId('status-group-not_started')).toHaveTextContent('par défaut');
		expect(
			within(screen.getByTestId('status-group-not_started')).queryByRole('button', {
				name: 'Supprimer Pas préparé'
			})
		).toBeNull();
		expect(
			within(screen.getByTestId('status-group-done')).getByRole('button', {
				name: 'Supprimer Dans les sacs'
			})
		).toBeVisible();
	});

	it('crée un statut dans la section où on l’a demandé', async () => {
		const user = userEvent.setup();
		vi.mocked(createItemStatus).mockResolvedValue({ ...inProgress, id: 4, name: 'En machine' });
		const onchanged = mount();

		await addIn(user, 'in_progress');
		await user.type(within(sheet()).getByLabelText('Nom du statut'), 'En machine');
		await user.click(within(sheet()).getByRole('button', { name: 'Ajouter' }));

		expect(createItemStatus).toHaveBeenCalledWith(
			7,
			'En machine',
			expect.any(String),
			'in_progress'
		);
		expect(onchanged).toHaveBeenCalled();
	});

	it('renomme et recolore un statut existant', async () => {
		const user = userEvent.setup();
		vi.mocked(updateItemStatus).mockResolvedValue({ ...done, name: 'Chargé' });
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Modifier Dans les sacs' }));
		const name = within(sheet()).getByLabelText('Nom du statut');
		await user.clear(name);
		await user.type(name, 'Chargé');
		await user.click(within(sheet()).getByRole('button', { name: 'Enregistrer' }));

		expect(updateItemStatus).toHaveBeenCalledWith(7, 3, { name: 'Chargé', color: '#5c8a66' });
		expect(onchanged).toHaveBeenCalled();
	});

	it('passe le défaut à un autre statut plutôt que de le retirer à celui-ci', async () => {
		const user = userEvent.setup();
		vi.mocked(updateItemStatus).mockResolvedValue({ ...inProgress, is_default: true });
		mount();

		await user.click(screen.getByRole('button', { name: 'Modifier Sorti du placard' }));
		await user.click(within(sheet()).getByRole('button', { name: 'Utiliser par défaut' }));

		expect(updateItemStatus).toHaveBeenCalledWith(7, 2, { is_default: true });

		await user.click(screen.getByRole('button', { name: 'Modifier Pas préparé' }));
		expect(within(sheet()).queryByRole('button', { name: 'Utiliser par défaut' })).toBeNull();
	});

	it('dit où partent les lignes de voyage avant de supprimer un statut', async () => {
		const user = userEvent.setup();
		vi.mocked(deleteItemStatus).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Supprimer Dans les sacs' }));

		expect(within(sheet()).getByTestId('status-fallout')).toHaveTextContent(
			'passent à un autre statut de la même section'
		);
		expect(deleteItemStatus).not.toHaveBeenCalled();

		await user.click(within(sheet()).getByRole('button', { name: 'Supprimer' }));

		expect(deleteItemStatus).toHaveBeenCalledWith(7, 3);
		expect(onchanged).toHaveBeenCalled();
	});

	it('relaie le refus de l’API plutôt que d’annoncer une panne', async () => {
		const user = userEvent.setup();
		vi.mocked(deleteItemStatus).mockRejectedValue(
			new ApiError(
				409,
				{
					detail: 'The default status cannot be deleted, make another status the default one first.'
				},
				'conflict'
			)
		);
		mount();

		await user.click(screen.getByRole('button', { name: 'Supprimer Dans les sacs' }));
		await user.click(within(sheet()).getByRole('button', { name: 'Supprimer' }));

		expect(
			await screen.findByText(
				'The default status cannot be deleted, make another status the default one first.'
			)
		).toBeInTheDocument();
		expect(screen.queryByText('L’API est injoignable.')).not.toBeInTheDocument();
	});
});
