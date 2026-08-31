import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdStatuses from './HouseholdStatuses.svelte';
import {
	ApiError,
	createItemStatus,
	deleteItemStatus,
	updateItemStatus,
	type ItemStatus
} from '$lib/api.js';
import { session } from '$lib/session.svelte.js';

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

const loaded: ItemStatus = {
	id: 4,
	name: 'Chargé dans la voiture',
	color: '#5c8a66',
	progress: 'done',
	position: 3,
	is_default: false
};

async function sheet() {
	const opened = await screen.findByRole('dialog');
	await waitFor(() => expect(opened.contains(document.activeElement)).toBe(true));
	return opened;
}

const BANDS: Record<string, number> = { not_started: 0, in_progress: 300, done: 600 };
const HEADER = 20;
const ROW = 40;

function box(top: number, height: number): DOMRect {
	return {
		top,
		bottom: top + height,
		height,
		left: 0,
		right: 0,
		width: 0,
		x: 0,
		y: top
	} as DOMRect;
}

function keyOf(element: Element | null) {
	return element?.getAttribute('data-testid')?.replace('status-group-', '');
}

function laidOut() {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		const group = keyOf(this);
		if (group && group in BANDS) return box(BANDS[group], 300);
		if (!this.hasAttribute('data-row')) return box(0, 0);
		const section = this.closest('[data-testid^="status-group-"]');
		const rank = [...(section?.querySelectorAll('[data-row]') ?? [])].indexOf(this);
		return box(BANDS[keyOf(section) ?? 'not_started'] + HEADER + rank * ROW, ROW);
	});
}

async function dragTo(status: ItemStatus, y: number | undefined = undefined) {
	await fireEvent.pointerDown(screen.getByTestId(`status-handle-${status.id}`), { pointerId: 1 });
	if (y !== undefined) await fireEvent.pointerMove(window, { pointerId: 1, clientY: y });
	await fireEvent.pointerUp(window, { pointerId: 1 });
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
	afterEach(() => {
		session.user = null;
		vi.restoreAllMocks();
	});

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
		await user.type(within(await sheet()).getByLabelText('Nom du statut'), 'En machine');
		await user.click(within(await sheet()).getByRole('button', { name: 'Ajouter' }));

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
		const name = within(await sheet()).getByLabelText('Nom du statut');
		await user.clear(name);
		await user.type(name, 'Chargé');
		await user.click(within(await sheet()).getByRole('button', { name: 'Enregistrer' }));

		expect(updateItemStatus).toHaveBeenCalledWith(7, 3, { name: 'Chargé', color: '#5c8a66' });
		expect(onchanged).toHaveBeenCalled();
	});

	it('passe le défaut à un autre statut', async () => {
		const user = userEvent.setup();
		vi.mocked(updateItemStatus).mockResolvedValue({ ...inProgress, is_default: true });
		mount();

		await user.click(screen.getByRole('button', { name: 'Modifier Sorti du placard' }));
		await user.click(within(await sheet()).getByRole('button', { name: 'Utiliser par défaut' }));

		expect(updateItemStatus).toHaveBeenCalledWith(7, 2, { is_default: true });
	});

	it('n’offre pas de retirer le défaut au statut qui le porte', async () => {
		const user = userEvent.setup();
		mount();

		await user.click(screen.getByRole('button', { name: 'Modifier Pas préparé' }));

		expect(within(await sheet()).queryByRole('button', { name: 'Utiliser par défaut' })).toBeNull();
	});

	it('dit où partent les lignes de voyage avant de supprimer un statut', async () => {
		const user = userEvent.setup();
		vi.mocked(deleteItemStatus).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Supprimer Dans les sacs' }));

		expect(within(await sheet()).getByTestId('status-fallout')).toHaveTextContent(
			'passent à un autre statut de la même section'
		);
		expect(deleteItemStatus).not.toHaveBeenCalled();

		await user.click(within(await sheet()).getByRole('button', { name: 'Supprimer' }));

		expect(deleteItemStatus).toHaveBeenCalledWith(7, 3);
		expect(onchanged).toHaveBeenCalled();
	});

	it('suit la langue du compte quand elle change sous les sections', async () => {
		mount();

		expect(screen.getByTestId('status-group-not_started')).toHaveTextContent('Pas prêt');

		session.user = {
			id: 1,
			display: 'sacha',
			email: 'sacha@example.com',
			has_usable_password: true,
			language: 'en'
		};
		await tick();

		expect(screen.getByTestId('status-group-not_started')).toHaveTextContent('Not ready');
		expect(screen.getByTestId('status-group-in_progress')).toHaveTextContent('In progress');
		expect(screen.getByTestId('status-group-done')).toHaveTextContent('Ready');
	});

	it('compte le rang d’une dépose sur la liste du foyer, pas sur la section', async () => {
		vi.mocked(updateItemStatus).mockResolvedValue({ ...done, progress: 'in_progress' });
		const onchanged = mount();
		laidOut();

		await dragTo(done, BANDS.in_progress + HEADER + ROW);

		expect(updateItemStatus).toHaveBeenCalledWith(7, 3, { progress: 'in_progress', position: 2 });
		expect(onchanged).toHaveBeenCalled();
	});

	it('remonte un statut au-dessus de son voisin de section', async () => {
		vi.mocked(updateItemStatus).mockResolvedValue(loaded);
		mount([notStarted, inProgress, done, loaded]);
		laidOut();

		await dragTo(loaded, BANDS.done + HEADER + ROW / 2);

		expect(updateItemStatus).toHaveBeenCalledWith(7, 4, { progress: 'done', position: 2 });
	});

	it('ne demande rien quand la poignée est lâchée où elle a été prise', async () => {
		mount();
		laidOut();

		await dragTo(inProgress);

		expect(updateItemStatus).not.toHaveBeenCalled();
	});

	it('change aussi de section depuis la feuille d’édition', async () => {
		const user = userEvent.setup();
		vi.mocked(updateItemStatus).mockResolvedValue({ ...done, progress: 'in_progress' });
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Modifier Dans les sacs' }));
		await user.selectOptions(within(await sheet()).getByLabelText('Section'), 'in_progress');
		await user.click(within(await sheet()).getByRole('button', { name: 'Enregistrer' }));

		expect(updateItemStatus).toHaveBeenCalledWith(7, 3, {
			name: 'Dans les sacs',
			color: '#5c8a66',
			progress: 'in_progress'
		});
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
		await user.click(within(await sheet()).getByRole('button', { name: 'Supprimer' }));

		expect(
			await screen.findByText(
				'The default status cannot be deleted, make another status the default one first.'
			)
		).toBeInTheDocument();
		expect(screen.queryByText('L’API est injoignable.')).not.toBeInTheDocument();
	});
});
