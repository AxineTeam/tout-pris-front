import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripLines, { type Direction, type Sorting } from './TripLines.svelte';
import {
	createKitItem,
	createTripItem,
	deleteTripItem,
	updateItemType,
	updateTripItem,
	type ItemStatus,
	type ItemType,
	type Kit,
	type KitItem,
	type Person,
	type ProgressCategory,
	type TripItem
} from '$lib/api.js';
import { queryClient, tripLinesQuery } from '$lib/query.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createKitItem: vi.fn(),
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
const holiday: Kit = { id: 6, name: 'Vacances', description: 'Le sac de plage', position: 2 };
const seaside: Kit = { id: 7, name: 'Bord de mer', description: '', position: 3 };

const alice: Person = { id: 1, name: 'Alice', user: null };
const bob: Person = { id: 2, name: 'Bob', user: null };
const chloe: Person = { id: 3, name: 'Chloé', user: null };

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

function ranked(
	id: number,
	name: string,
	progress: ProgressCategory,
	position: number
): ItemStatus {
	return { id, name, color: '#123456', progress, position, is_default: false };
}

// Ce que devient un foyer neuf quand on ajoute « À sortir » dans la section
// « Pas prêt » : l'API pose le nouveau statut au dernier rang du foyer, toutes
// sections confondues, donc les rangs contredisent la hiérarchie affichée.
const unprepared = ranked(11, 'Pas préparé', 'not_started', 0);
const out = ranked(12, 'Sorti du placard', 'in_progress', 1);
const bagged = ranked(13, 'Dans les sacs', 'done', 2);
const pulled = ranked(14, 'À sortir', 'not_started', 3);
const jumbled = [unprepared, out, bagged, pulled];

function show(
	lines: TripItem[],
	sorted: Sorting = 'order',
	participants = [alice, bob],
	statuses = catalogue
) {
	render(TripLines, {
		props: {
			household: 7,
			trip: 3,
			lines,
			participants,
			items: [tent, socks, map],
			kits: [camping, holiday, seaside],
			statuses,
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

function cached(): TripItem[] | undefined {
	return queryClient.getQueryData<TripItem[]>(tripLinesQuery(7, 3).queryKey);
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

	it('réunit les lignes de deux personnes retenues', async () => {
		const user = userEvent.setup();
		show(
			[
				line(socks, todo, { person: alice }),
				line(tent, todo, { person: bob }),
				line(map, todo, { person: chloe })
			],
			'order',
			[alice, bob, chloe]
		);

		const row = screen.getByRole('group', { name: 'Filtrer par personne' });
		const all = within(row).getByRole('button', { name: 'Tous' });
		await user.click(within(row).getByRole('button', { name: 'Alice' }));
		await user.click(within(row).getByRole('button', { name: 'Bob' }));

		expect(names()).toEqual(['Chaussettes', 'Tente']);
		expect(all).toHaveAttribute('aria-pressed', 'false');

		await user.click(within(row).getByRole('button', { name: 'Bob' }));
		await user.click(within(row).getByRole('button', { name: 'Alice' }));

		expect(names()).toEqual(['Chaussettes', 'Tente', 'Carte']);
		expect(all).toHaveAttribute('aria-pressed', 'true');
	});

	it('croise la rangée personne et la rangée statut', async () => {
		const user = userEvent.setup();
		show([
			line(socks, todo, { person: alice }),
			line(tent, packed, { person: alice }),
			line(map, packed, { person: bob })
		]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par personne' })).getByRole('button', {
				name: 'Alice'
			})
		);
		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par statut' })).getByRole('button', {
				name: 'Rangé'
			})
		);

		expect(names()).toEqual(['Tente']);
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
		// The filters step aside so the object being pointed at is on screen.
		expect(names()).toEqual(['Tente', 'Chaussettes']);
		expect(
			within(screen.getByRole('group', { name: 'Filtrer par kit' })).getByRole('button', {
				name: 'Tous'
			})
		).toHaveAttribute('aria-pressed', 'true');
	});

	it('trie alphabétiquement, dans un sens puis dans l’autre', async () => {
		const props = {
			household: 7,
			trip: 3,
			lines: [line(tent, todo), line(socks, todo), line(map, todo)],
			participants: [alice],
			items: [],
			kits: [],
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

	it('monte la quantité d’une ligne sans attendre la réponse', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice, quantity: 2 });
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, [only]);
		vi.mocked(updateTripItem).mockReturnValue(new Promise(() => {}));
		show([only]);

		await user.click(screen.getByRole('button', { name: 'Un de plus pour Alice' }));

		expect(updateTripItem).toHaveBeenCalledWith(7, 3, only.id, { quantity: 3 });
		await vi.waitFor(() => expect(cached()?.[0].quantity).toBe(3));
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

	it('coupe le sondage déjà en vol quand un doigt attrape une carte', async () => {
		const only = line(socks, todo);
		const key = tripLinesQuery(7, 3).queryKey;
		queryClient.setQueryData(key, [only]);
		const polling = queryClient.fetchQuery({
			queryKey: key,
			queryFn: () => new Promise<TripItem[]>(() => {}),
			staleTime: 0
		});
		polling.catch(() => {});
		show([only]);

		await fireEvent.pointerDown(screen.getByTestId(`trip-item-handle-${socks.id}`), {
			pointerId: 1
		});

		await vi.waitFor(() => expect(queryClient.isFetching({ queryKey: key })).toBe(0));
		await fireEvent.pointerUp(window, { pointerId: 1 });
	});

	it('n’offre pas d’ancre sur un tri calculé', () => {
		show([line(socks, todo), line(tent, todo)], 'name');

		expect(screen.queryByTestId(`trip-item-handle-${socks.id}`)).not.toBeInTheDocument();
	});

	it('coche la ligne avant la réponse du serveur, sans figer sa pastille', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, [only]);
		vi.mocked(updateTripItem).mockReturnValue(new Promise(() => {}));
		show([only]);

		const pill = screen.getByRole('button', { name: /Chaussettes pour Alice/ });
		await user.click(pill);

		await vi.waitFor(() => expect(cached()?.[0].status).toEqual(packed));
		expect(pill).toBeEnabled();
	});

	it('remet la ligne comme elle était quand l’écriture est refusée', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, [only]);
		let refuse: (cause: Error) => void = () => {};
		vi.mocked(updateTripItem).mockReturnValue(
			new Promise<TripItem>((_, reject) => (refuse = reject))
		);
		show([only]);

		await user.click(screen.getByRole('button', { name: /Chaussettes pour Alice/ }));
		await vi.waitFor(() => expect(cached()?.[0].status).toEqual(packed));

		refuse(new Error('refus'));

		await vi.waitFor(() => expect(cached()?.[0].status).toEqual(todo));
		expect(screen.getByText('L’API est injoignable.')).toBeInTheDocument();
	});

	it('ne remet en place que la ligne refusée, pas celles cochées entre-temps', async () => {
		const user = userEvent.setup();
		const first = line(socks, todo, { person: alice });
		const second = line(tent, todo);
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, [first, second]);
		let refuse: (cause: Error) => void = () => {};
		vi.mocked(updateTripItem)
			.mockReturnValueOnce(new Promise<TripItem>((_, reject) => (refuse = reject)))
			.mockResolvedValueOnce({ ...second, status: packed });
		show([first, second]);

		await user.click(screen.getByRole('button', { name: /Chaussettes pour Alice/ }));
		await user.click(screen.getByRole('button', { name: /Tente pour Tout le monde/ }));
		await vi.waitFor(() => expect(cached()?.[1].status).toEqual(packed));

		refuse(new Error('refus'));

		await vi.waitFor(() => expect(cached()?.[0].status).toEqual(todo));
		expect(cached()?.[1].status).toEqual(packed);
	});

	it('ne laisse pas une réponse de sondage en retard défaire une coche', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		const key = tripLinesQuery(7, 3).queryKey;
		queryClient.setQueryData(key, [only]);
		let answer: (all: TripItem[]) => void = () => {};
		const polling = queryClient.fetchQuery({
			queryKey: key,
			queryFn: () => new Promise<TripItem[]>((resolve) => (answer = resolve)),
			staleTime: 0
		});
		vi.mocked(updateTripItem).mockReturnValue(new Promise(() => {}));
		show([only]);

		await user.click(screen.getByRole('button', { name: /Chaussettes pour Alice/ }));
		await vi.waitFor(() => expect(cached()?.[0].status).toEqual(packed));

		answer([only]);
		await polling.catch(() => {});

		expect(cached()?.[0].status).toEqual(packed);
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

	it('avance dans l’ordre des sections quand les rangs du foyer les contredisent', async () => {
		const user = userEvent.setup();
		const only = line(tent, unprepared);
		const { rerender } = render(TripLines, {
			props: {
				household: 7,
				trip: 3,
				lines: [only],
				participants: [],
				items: [tent],
				kits: [],
				statuses: jumbled,
				onchanged
			}
		});

		for (const next of [pulled, out, bagged, unprepared]) {
			await user.click(screen.getByRole('button', { name: /Tente pour Tout le monde/ }));
			expect(updateTripItem).toHaveBeenLastCalledWith(7, 3, only.id, { status: next.id });
			await rerender({ lines: [{ ...only, status: next }] });
		}
	});

	it('repart du premier statut quand celui de la ligne a quitté le foyer', async () => {
		const user = userEvent.setup();
		const only = line(tent, ranked(99, 'Supprimé', 'done', 9));
		show([only], 'order', [], jumbled);

		await user.click(screen.getByRole('button', { name: /Tente pour Tout le monde/ }));

		expect(updateTripItem).toHaveBeenCalledWith(7, 3, only.id, { status: unprepared.id });
	});

	it('range les filtres par statut dans l’ordre des sections', () => {
		show([line(tent, bagged), line(socks, pulled), line(map, unprepared)], 'order', [], jumbled);

		const row = screen.getByRole('group', { name: 'Filtrer par statut' });
		expect(
			within(row)
				.getAllByRole('button')
				.map((one) => one.textContent?.trim())
		).toEqual(['Tous', 'Pas préparé', 'À sortir', 'Dans les sacs']);
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
		expect(screen.getByTestId('sheet-kits')).toBeInTheDocument();
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

	it('garde la feuille ouverte quand un statut avancé sort du filtre', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice }), line(tent, todo)]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par statut' })).getByRole('button', {
				name: 'À prendre'
			})
		);
		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		const sheet = screen.getByRole('dialog');
		await user.click(within(sheet).getByRole('button', { name: /Chaussettes pour Alice/ }));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('montre toutes les lignes de l’objet, même celles qu’un filtre cache', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice }), line(socks, packed, { person: bob })]);

		await user.click(
			within(screen.getByRole('group', { name: 'Filtrer par personne' })).getByRole('button', {
				name: 'Alice'
			})
		);
		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));

		const sheet = screen.getByRole('dialog');
		expect(within(sheet).getByText('Alice')).toBeInTheDocument();
		expect(within(sheet).getByText('Bob')).toBeInTheDocument();
	});

	it('ne rouvre pas la feuille d’un objet supprimé puis rajouté', async () => {
		const user = userEvent.setup();
		const only = line(socks, todo, { person: alice });
		const other = line(tent, todo);
		// The screen behind reloads on every write, as the page makes it do.
		let served = [only, other];
		const reload = vi.fn(async () => {
			await rerender({ lines: served });
		});
		const { rerender } = render(TripLines, {
			props: {
				household: 7,
				trip: 3,
				lines: served,
				participants: [alice],
				items: [tent, socks],
				kits: [],
				statuses: catalogue,
				onchanged: reload
			}
		});

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Retirer/ }));
		served = [other];
		await user.click(screen.getByRole('button', { name: 'Retirer la ligne' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await rerender({ lines: [line(socks, todo, { person: alice }), other] });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('remplace la feuille par la confirmation au lieu de l’empiler', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice })]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Retirer/ }));

		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		expect(screen.getByRole('button', { name: 'Retirer la ligne' })).toBeInTheDocument();
	});

	it('coche un kit qui porte déjà l’objet, et interdit de l’en retirer', async () => {
		const user = userEvent.setup();
		show([line(socks, todo, { person: alice, kits: [camping] })]);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByTestId('sheet-kits'));

		expect(screen.getAllByRole('dialog')).toHaveLength(1);
		const serving = screen.getByRole('button', { name: '« Camping » contient déjà cet objet' });
		expect(serving).toBeDisabled();
		expect(serving).toHaveAttribute('aria-pressed', 'true');
		expect(serving).toHaveTextContent('déjà dans ce kit');
		expect(screen.getByRole('button', { name: 'Ajouter à Vacances' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
	});

	it('sert un kit entier avant le suivant, avec les personnes et les quantités du voyage', async () => {
		const user = userEvent.setup();
		const held = [
			line(socks, todo, { person: alice, kits: [seaside] }),
			line(socks, todo, { quantity: 3, kits: [seaside] })
		];
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, held);
		show(held);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByTestId('sheet-kits'));
		await user.click(screen.getByRole('button', { name: 'Ajouter à Vacances' }));
		await user.click(screen.getByRole('button', { name: 'Ajouter à Camping' }));
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(vi.mocked(createKitItem).mock.calls).toEqual([
			[7, camping.id, { item_type: socks.id, person: alice.id, quantity: 1 }],
			[7, camping.id, { item_type: socks.id, person: null, quantity: 3 }],
			[7, holiday.id, { item_type: socks.id, person: alice.id, quantity: 1 }],
			[7, holiday.id, { item_type: socks.id, person: null, quantity: 3 }]
		]);
		const cached = queryClient.getQueryData<TripItem[]>(tripLinesQuery(7, 3).queryKey);
		expect(cached?.map((one) => one.kits.map((kit) => kit.name))).toEqual([
			['Camping', 'Vacances', 'Bord de mer'],
			['Camping', 'Vacances', 'Bord de mer']
		]);
		// No trip line moved, so the lines route stands on the same fingerprint:
		// asking again would hand back an object that belongs to no new kit.
		expect(onchanged).not.toHaveBeenCalled();
		expect(screen.getByTestId('sheet-kits')).toBeInTheDocument();
	});

	it('garde le sélecteur, son erreur et les kits déjà servis quand un kit refuse', async () => {
		const user = userEvent.setup();
		const held = [line(socks, todo, { person: alice })];
		queryClient.setQueryData(tripLinesQuery(7, 3).queryKey, held);
		vi.mocked(createKitItem)
			.mockResolvedValueOnce({} as KitItem)
			.mockRejectedValueOnce(new Error('refus'));
		show(held);

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByTestId('sheet-kits'));
		await user.click(screen.getByRole('button', { name: 'Ajouter à Camping' }));
		await user.click(screen.getByRole('button', { name: 'Ajouter à Bord de mer' }));
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(vi.mocked(createKitItem).mock.calls).toEqual([
			[7, camping.id, { item_type: socks.id, person: alice.id, quantity: 1 }],
			[7, seaside.id, { item_type: socks.id, person: alice.id, quantity: 1 }]
		]);
		const cached = queryClient.getQueryData<TripItem[]>(tripLinesQuery(7, 3).queryKey);
		expect(cached?.[0].kits.map((kit) => kit.name)).toEqual(['Camping']);
		const picker = screen.getByRole('dialog');
		expect(within(picker).getByText('L’API est injoignable.')).toBeInTheDocument();
		expect(within(picker).getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
	});

	it('annonce un foyer sans kit plutôt qu’une liste vide', async () => {
		const user = userEvent.setup();
		render(TripLines, {
			props: {
				household: 7,
				trip: 3,
				lines: [line(socks, todo, { person: alice })],
				participants: [alice],
				items: [socks],
				kits: [],
				statuses: catalogue,
				onchanged
			}
		});

		await user.click(screen.getByRole('button', { name: 'Ouvrir « Chaussettes »' }));
		await user.click(screen.getByTestId('sheet-kits'));

		expect(screen.getByText('Ce foyer n’a encore aucun kit.')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Ajouter' })).not.toBeInTheDocument();
	});

	it('annonce un voyage sans ligne', () => {
		show([]);

		expect(screen.getByTestId('trip-empty')).toBeInTheDocument();
	});
});
