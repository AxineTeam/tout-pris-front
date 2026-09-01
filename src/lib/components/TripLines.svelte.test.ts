import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripLines, { type Direction, type Sorting } from './TripLines.svelte';
import {
	createTripItem,
	deleteTripItem,
	updateItemType,
	updateTripItem,
	type ItemStatus,
	type ItemType,
	type Kit,
	type Person,
	type ProgressCategory,
	type TripItem
} from '$lib/api.js';
import { queryClient, tripLinesQuery } from '$lib/query.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createTripItem: vi.fn(),
	updateTripItem: vi.fn(),
	deleteTripItem: vi.fn(),
	updateItemType: vi.fn()
}));

function status(id: number, name: string, progress: ProgressCategory): ItemStatus {
	return { id, name, color: '#123456', progress, position: id, is_default: id === 1 };
}

const todo = status(1, 'À prendre', 'not_started');
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

const catalogue = [todo, packed];

function show(lines: TripItem[], sorted: Sorting = 'order', participants = [alice, bob]) {
	render(TripLines, {
		props: {
			household: 7,
			trip: 3,
			lines,
			participants,
			items: [tent, socks, map],
			statuses: catalogue,
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

	it('ne déplace pas les lignes qu’un filtre cache', async () => {
		const ROW = 100;
		// Ordre stocké : Tente, Carte (cachée par le filtre), Chaussettes.
		const tentOne = line(tent, todo, { kits: [camping] });
		const hidden = line(map, todo);
		const socksOne = line(socks, todo, { kits: [camping] });
		show([tentOne, hidden, socksOne]);

		const user = userEvent.setup();
		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par kit' })).getByRole('button', {
				name: 'Camping'
			})
		);
		expect(names()).toEqual(['Tente', 'Chaussettes']);

		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			const row = this.getAttribute('data-row');
			if (!row) return new DOMRect(0, 0, 0, 0);
			return new DOMRect(0, (row === String(tent.id) ? 0 : 1) * ROW, 300, ROW);
		});

		// Chaussettes passe au-dessus de Tente : la carte cachée ne bouge pas.
		await fireEvent.pointerDown(screen.getByTestId(`trip-item-handle-${socks.id}`), {
			pointerId: 1
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: ROW * 0.1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(vi.mocked(updateTripItem).mock.calls).toEqual([[7, 3, socksOne.id, { position: 0 }]]);
		vi.restoreAllMocks();
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

	it('trie alphabétiquement, dans un sens puis dans l’autre', async () => {
		const props = {
			household: 7,
			trip: 3,
			lines: [line(tent, todo), line(socks, todo), line(map, todo)],
			participants: [alice],
			items: [],
			statuses: catalogue,
			sorted: 'order' as Sorting,
			direction: 'up' as Direction,
			onchanged
		};
		const { rerender } = render(TripLines, { props });

		expect(names()).toEqual(['Tente', 'Chaussettes', 'Carte']);
		await rerender({ direction: 'down' });
		expect(names()).toEqual(['Carte', 'Chaussettes', 'Tente']);
		await rerender({ sorted: 'name', direction: 'up' });
		expect(names()).toEqual(['Carte', 'Chaussettes', 'Tente']);
		await rerender({ direction: 'down' });
		expect(names()).toEqual(['Tente', 'Chaussettes', 'Carte']);
	});

	it('ne garde que les lignes du statut choisi', async () => {
		const user = userEvent.setup();
		show([line(socks, todo), line(tent, packed)]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par statut' })).getByRole('button', {
				name: 'Rangé'
			})
		);

		expect(names()).toEqual(['Tente']);
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

	it('avance le statut d’une ligne d’une tape, et boucle au bout', async () => {
		const user = userEvent.setup();
		const first = line(socks, todo, { person: alice });
		const last = line(tent, packed);
		show([first, last]);

		await user.click(screen.getByRole('button', { name: /Chaussettes pour Alice/ }));
		expect(updateTripItem).toHaveBeenCalledWith(7, 3, first.id, { status: packed.id });

		await user.click(screen.getByRole('button', { name: /Tente pour Tout le monde/ }));
		expect(updateTripItem).toHaveBeenLastCalledWith(7, 3, last.id, { status: todo.id });
	});

	it('ouvre la feuille de l’objet sur le chevron, avec toutes ses lignes', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice }), line(socks, packed, { person: bob })]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));

		const sheet = screen.getByRole('dialog');
		expect(within(sheet).getByText('Alice')).toBeInTheDocument();
		expect(within(sheet).getByText('Bob')).toBeInTheDocument();
		expect(within(sheet).getByTestId('sheet-add-common')).toBeInTheDocument();
	});

	it('avance un statut depuis la feuille', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		show([only]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		const sheet = screen.getByRole('dialog');
		await user.click(within(sheet).getByRole('button', { name: /Chaussettes pour Alice/ }));

		expect(updateTripItem).toHaveBeenCalledWith(7, 3, only.id, { status: packed.id });
	});

	it('remplace la feuille par l’éditeur, et la remet en fermant', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice })]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByRole('button', { name: 'Modifier l’objet « Chaussettes »' }));

		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		expect(screen.getByLabelText('Nom de l’objet')).toHaveValue('Chaussettes');

		await user.click(screen.getByRole('button', { name: 'Fermer' }));
		expect(screen.getByTestId('sheet-add-common')).toBeInTheDocument();
	});

	it('suit l’objet qui reste après une fusion', async () => {
		const user = userEvent.setup();
		vi.mocked(updateItemType).mockResolvedValue(tent);
		show([line(socks, todo, { person: alice }), line(tent, todo)]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByRole('button', { name: 'Modifier l’objet « Chaussettes »' }));
		await user.clear(screen.getByLabelText('Nom de l’objet'));
		await user.type(screen.getByLabelText('Nom de l’objet'), 'Tente');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		const sheet = screen.getByRole('dialog');
		expect(within(sheet).getByRole('heading', { name: 'Tente' })).toBeInTheDocument();
	});

	it('pose l’objet rendu par l’écriture dans les lignes en cache, sans redemander', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		const noted = { id: socks.id, name: 'Chaussettes', description: 'Une paire par jour' };
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, [only]);
		vi.mocked(updateItemType).mockResolvedValue(noted);
		show([only]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByRole('button', { name: 'Modifier l’objet « Chaussettes »' }));
		await user.type(screen.getByLabelText('Description de l’objet'), 'Une paire par jour');
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		const cached = queryClient.getQueryData<TripItem[]>(tripLinesQuery(7, 3).queryKey);
		expect(cached?.[0].item_type.description).toBe('Une paire par jour');
		// A rename moves no line, so the fingerprint stands still: asking again
		// would hand back the old text and undo what the write just said.
		expect(onchanged).not.toHaveBeenCalled();
	});

	it('annonce un voyage sans ligne', () => {
		show([]);

		expect(screen.getByTestId('trip-empty')).toBeInTheDocument();
	});
});
