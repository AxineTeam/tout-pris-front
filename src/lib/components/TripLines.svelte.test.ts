import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripLines, { type Sorting } from './TripLines.svelte';
import {
	createTripItem,
	deleteTripItem,
	updateTripItem,
	type ItemStatus,
	type ItemType,
	type Kit,
	type Person,
	type ProgressCategory,
	type TripItem
} from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createTripItem: vi.fn(),
	updateTripItem: vi.fn(),
	deleteTripItem: vi.fn()
}));

function status(id: number, name: string, progress: ProgressCategory): ItemStatus {
	return { id, name, color: '#123456', progress, position: id, is_default: id === 1 };
}

const todo = status(1, 'À prendre', 'not_started');
const packing = status(2, 'En cours', 'in_progress');
const packed = status(3, 'Rangé', 'done');

function itemType(id: number, name: string, description = ''): ItemType {
	return { id, name, description };
}

const tent = itemType(1, 'Tente', 'Deux places');
const socks = itemType(2, 'Chaussettes');
const map = itemType(3, 'Carte');

const camping: Kit = { id: 5, name: 'Camping', description: '', position: 1 };

const alice: Person = { id: 1, name: 'Alice', user: null };
const bob: Person = { id: 2, name: 'Bob', user: null };

let next = 0;

function line(item: ItemType, state: ItemStatus, over: Partial<TripItem> = {}): TripItem {
	next += 1;
	return {
		id: next,
		item_type: item,
		person: null,
		quantity: 1,
		status: state,
		position: next,
		kits: [],
		...over
	};
}

const onchanged = vi.fn().mockResolvedValue(undefined);

function show(lines: TripItem[], sorted: Sorting = 'order', participants = [alice, bob]) {
	render(TripLines, {
		props: {
			household: 7,
			trip: 3,
			lines,
			participants,
			items: [tent, socks, map],
			sorted,
			onchanged
		}
	});
}

function names(): string[] {
	return screen
		.getAllByRole('listitem')
		.filter((one) => one.dataset.tripItem)
		.map((one) => one.querySelector('span span')?.textContent?.trim() ?? '');
}

function card(name: string): HTMLElement {
	return screen.getByText(name).closest('li[data-row]') as HTMLElement;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('TripLines', () => {
	it('regroupe les lignes d’un même objet sous une seule carte', () => {
		show([
			line(socks, todo, { person: alice }),
			line(tent, todo),
			line(socks, packed, { person: bob })
		]);

		expect(names()).toEqual(['Chaussettes', 'Tente']);
		expect(within(card('Chaussettes')).getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
	});

	it('nomme la ligne sans personne « Tout le monde »', () => {
		show([line(tent, todo)]);

		expect(screen.getByText('Tout le monde')).toBeInTheDocument();
	});

	it('montre les kits de l’objet', () => {
		show([line(tent, todo, { kits: [camping] })]);

		expect(within(card('Tente')).getByText('Camping')).toBeInTheDocument();
	});

	it('ne garde que les objets du kit choisi', async () => {
		const user = userEvent.setup();
		show([line(tent, todo, { kits: [camping] }), line(socks, todo)]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par kit' })).getByRole('button', {
				name: 'Camping'
			})
		);

		expect(names()).toEqual(['Tente']);
	});

	it('garde les lignes communes quand on filtre sur une personne', async () => {
		const user = userEvent.setup();
		show([
			line(socks, todo, { person: alice }),
			line(socks, todo, { person: bob }),
			line(tent, todo)
		]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par personne' })).getByRole('button', {
				name: 'Alice'
			})
		);

		expect(names()).toEqual(['Chaussettes', 'Tente']);
		expect(within(card('Chaussettes')).queryByText('Bob')).not.toBeInTheDocument();
	});

	it('retire l’ancre tant qu’un filtre est posé', async () => {
		const user = userEvent.setup();
		show([line(tent, todo, { kits: [camping] }), line(socks, todo)]);

		expect(screen.getByTestId(`trip-item-handle-${tent.id}`)).toBeInTheDocument();
		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par kit' })).getByRole('button', {
				name: 'Camping'
			})
		);
		expect(screen.queryByTestId(`trip-item-handle-${tent.id}`)).not.toBeInTheDocument();
	});

	it('ne propose pas de recréer un objet qu’un filtre cache', async () => {
		const user = userEvent.setup();
		show([line(tent, todo, { kits: [camping] }), line(socks, todo)]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par kit' })).getByRole('button', {
				name: 'Camping'
			})
		);
		await user.click(screen.getByRole('combobox'));
		await user.keyboard('Chaussettes');
		await user.click(screen.getAllByRole('option')[0]);

		expect(createTripItem).not.toHaveBeenCalled();
	});

	it('trie par nom puis par ce qui reste à faire', async () => {
		const { rerender } = render(TripLines, {
			props: {
				household: 7,
				trip: 3,
				lines: [line(tent, packed), line(socks, todo), line(map, packing)],
				participants: [alice],
				items: [],
				sorted: 'order' as Sorting,
				onchanged
			}
		});

		expect(names()).toEqual(['Tente', 'Chaussettes', 'Carte']);
		await rerender({ sorted: 'name' });
		expect(names()).toEqual(['Carte', 'Chaussettes', 'Tente']);
		await rerender({ sorted: 'progress' });
		expect(names()).toEqual(['Chaussettes', 'Carte', 'Tente']);
	});

	it('classe un objet sur sa ligne la moins avancée', () => {
		show([line(tent, packed), line(socks, packed), line(socks, todo)], 'progress');

		expect(names()).toEqual(['Chaussettes', 'Tente']);
	});

	it('monte la quantité d’une ligne', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice, quantity: 2 })]);

		await user.click(screen.getByRole('button', { name: 'Un de plus pour Alice' }));

		expect(updateTripItem).toHaveBeenCalledWith(7, 3, expect.any(Number), { quantity: 3 });
		expect(onchanged).toHaveBeenCalled();
	});

	it('demande confirmation plutôt que de descendre sous un', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice })]);

		await user.click(screen.getByRole('button', { name: 'Un de moins pour Alice' }));

		expect(updateTripItem).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Retirer la ligne' }));
		expect(deleteTripItem).toHaveBeenCalledWith(7, 3, expect.any(Number));
	});

	it('n’offre d’ajouter que les personnes qui partent et qui manquent', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice })]);

		const group = card('Chaussettes');
		expect(within(group).getByRole('button', { name: 'Ajouter une ligne pour Bob' })).toBeVisible();
		expect(
			within(group).queryByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).not.toBeInTheDocument();

		await user.click(within(group).getByRole('button', { name: 'Ajouter une ligne pour Bob' }));
		expect(createTripItem).toHaveBeenCalledWith(7, 3, { item_type: socks.id, person: bob.id });
	});

	it('ajoute une ligne pour tout le monde depuis la recherche', async () => {
		const user = userEvent.setup();
		show([line(socks, todo)]);

		await user.click(screen.getByRole('combobox'));
		await user.keyboard('Tente');
		await user.click(screen.getAllByRole('option')[0]);

		expect(createTripItem).toHaveBeenCalledWith(7, 3, { item_type: tent.id, person: null });
	});

	it('déplace toutes les lignes de l’objet attrapé, et seulement les rangs changés', async () => {
		const ROW = 100;
		const socksOne = line(socks, todo, { person: alice });
		const socksTwo = line(socks, todo, { person: bob });
		const tentOne = line(tent, todo);
		show([socksOne, socksTwo, tentOne]);

		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			const row = this.getAttribute('data-row');
			if (!row) return new DOMRect(0, 0, 0, 0);
			const rank = row === String(socks.id) ? 0 : 1;
			return new DOMRect(0, rank * ROW, 300, ROW);
		});

		await fireEvent.pointerDown(screen.getByTestId(`trip-item-handle-${socks.id}`), {
			pointerId: 1
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: ROW * 1.9 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(vi.mocked(updateTripItem).mock.calls).toEqual([[7, 3, tentOne.id, { position: 0 }]]);
		vi.restoreAllMocks();
	});

	it('n’offre pas d’ancre sur un tri calculé', () => {
		show([line(socks, todo), line(tent, todo)], 'name');

		expect(screen.queryByTestId(`trip-item-handle-${socks.id}`)).not.toBeInTheDocument();
	});

	it('annonce un voyage sans ligne', () => {
		show([]);

		expect(screen.getByTestId('trip-empty')).toBeInTheDocument();
	});
});
