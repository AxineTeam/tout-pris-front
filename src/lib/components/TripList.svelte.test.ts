import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripList from './TripList.svelte';
import { goto } from '$app/navigation';
import { deleteTrip, duplicateTrip, updateTrip, type Trip } from '$lib/api.js';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	updateTrip: vi.fn(),
	duplicateTrip: vi.fn(),
	deleteTrip: vi.fn()
}));

function inDays(days: number): string {
	const day = new Date();
	day.setDate(day.getDate() + days);
	const month = String(day.getMonth() + 1).padStart(2, '0');
	return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, '0')}`;
}

const corse: Trip = { id: 1, name: 'Corse', date: inDays(9), archived_at: null };
const arcs: Trip = {
	id: 2,
	name: 'Les Arcs',
	date: inDays(-40),
	archived_at: '2026-03-02T08:00:00Z'
};

const onchanged = vi.fn();

function show(trips: Trip[] = [corse], archived: Trip[] = []) {
	render(TripList, { props: { household: 7, trips, archived, onchanged } });
}

function row(trip: Trip) {
	return screen.getByTestId(`trip-${trip.id}`);
}

async function act(user: UserEvent, trip: Trip, action: string) {
	await user.click(within(row(trip)).getByRole('button'));
	await user.click(await screen.findByRole('menuitem', { name: action }));
}

function sheet() {
	return screen.findByRole('dialog');
}

async function fill(user: UserEvent, name: string, date: string) {
	const opened = await sheet();
	await user.clear(within(opened).getByLabelText('Nom du voyage'));
	await user.type(within(opened).getByLabelText('Nom du voyage'), name);
	await fireEvent.input(within(opened).getByLabelText('Date de départ'), {
		target: { value: date }
	});
}

describe('TripList', () => {
	beforeEach(() => {
		vi.mocked(updateTrip).mockResolvedValue(corse);
		vi.mocked(duplicateTrip).mockResolvedValue(corse);
		vi.mocked(deleteTrip).mockResolvedValue(undefined);
	});

	it('dit dans combien de jours part un voyage en cours', () => {
		show();

		expect(row(corse)).toHaveTextContent('dans 9 jours');
	});

	it('lit une date dépassée sans compter à l’envers', () => {
		show([{ ...corse, date: inDays(-3) }]);

		expect(row(corse)).toHaveTextContent('il y a 3 jours');
	});

	it('ne donne à un voyage archivé que son nom et sa date', () => {
		show([], [arcs]);

		expect(row(arcs)).toHaveTextContent('Les Arcs');
		expect(row(arcs)).not.toHaveTextContent('il y a');
	});

	it('tient le menu dans la carte du voyage, à côté de son lien', () => {
		show();

		expect(within(row(corse)).getByRole('link').parentElement).toContainElement(
			within(row(corse)).getByRole('button')
		);
	});

	it('pose le chevron après le menu, hors du lien', () => {
		show();

		const link = within(row(corse)).getByRole('link');

		expect(link.querySelector('svg')).toBeNull();
		expect(link.parentElement?.lastElementChild?.tagName).toBe('svg');
	});

	it('mène au détail du voyage depuis sa ligne', () => {
		show();

		expect(within(row(corse)).getByRole('link')).toHaveAttribute('href', '/households/7/trips/1');
	});

	it('ouvre aussi le détail d’un voyage archivé', () => {
		show([], [arcs]);

		expect(within(row(arcs)).getByRole('link')).toHaveAttribute('href', '/households/7/trips/2');
	});

	it('annonce le foyer qui n’a encore aucun voyage', () => {
		show([], []);

		expect(screen.getByTestId('trips-empty')).toBeVisible();
	});

	it('se tait sur le vide tant qu’il reste des archives', () => {
		show([], [arcs]);

		expect(screen.queryByTestId('trips-empty')).not.toBeInTheDocument();
	});

	it('mène au formulaire depuis la carte de création', async () => {
		const user = userEvent.setup();
		show();

		await user.click(screen.getByRole('button', { name: 'Nouveau voyage' }));

		expect(goto).toHaveBeenCalledWith('/households/7/trips/new');
	});

	it('archive un voyage depuis sa ligne', async () => {
		const user = userEvent.setup();
		show();

		await act(user, corse, 'Archiver');

		expect(updateTrip).toHaveBeenCalledWith(7, 1, { archived: true });
		expect(onchanged).toHaveBeenCalled();
	});

	it('ramène un archivé dans les voyages en cours', async () => {
		const user = userEvent.setup();
		show([], [arcs]);

		await act(user, arcs, 'Désarchiver');

		expect(updateTrip).toHaveBeenCalledWith(7, 2, { archived: false });
	});

	it('duplique en proposant le nom d’origine suivi de « (copie) »', async () => {
		const user = userEvent.setup();
		show();

		await act(user, corse, 'Dupliquer');

		expect(within(await sheet()).getByLabelText('Nom du voyage')).toHaveValue('Corse (copie)');
	});

	it('duplique en proposant la date du jour', async () => {
		const user = userEvent.setup();
		show();

		await act(user, corse, 'Dupliquer');

		expect(within(await sheet()).getByLabelText('Date de départ')).toHaveValue(inDays(0));
	});

	it('duplique sous le nom et la date demandés', async () => {
		const user = userEvent.setup();
		show();

		await act(user, corse, 'Dupliquer');
		await fill(user, 'Les Arcs', '2027-02-14');
		await user.click(within(await sheet()).getByRole('button', { name: 'Dupliquer' }));

		expect(duplicateTrip).toHaveBeenCalledWith(7, 1, 'Les Arcs', '2027-02-14');
		expect(onchanged).toHaveBeenCalled();
	});

	it('ne supprime un voyage qu’une fois la suppression confirmée', async () => {
		const user = userEvent.setup();
		show();

		await act(user, corse, 'Supprimer');

		expect(deleteTrip).not.toHaveBeenCalled();

		await user.click(within(await sheet()).getByRole('button', { name: 'Supprimer' }));

		expect(deleteTrip).toHaveBeenCalledWith(7, 1);
		expect(onchanged).toHaveBeenCalled();
	});
});
