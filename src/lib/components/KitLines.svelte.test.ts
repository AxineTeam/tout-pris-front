import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import KitLines from './KitLines.svelte';
import {
	createItemType,
	createKitItem,
	updateKitItem,
	type ItemType,
	type KitDetail,
	type KitItem,
	type Person
} from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createItemType: vi.fn(),
	createKitItem: vi.fn(),
	updateKitItem: vi.fn(),
	deleteKitItem: vi.fn()
}));

const tent: ItemType = { id: 1, name: 'Tente', description: 'Deux places' };
const socks: ItemType = { id: 2, name: 'Chaussettes', description: '' };
const map: ItemType = { id: 3, name: 'Carte', description: '' };

const alice: Person = { id: 1, name: 'Alice', user: null };
const bob: Person = { id: 2, name: 'Bob', user: null };
const chloe: Person = { id: 3, name: 'Chloé', user: null };

const onchanged = vi.fn().mockResolvedValue(undefined);

function line(item: ItemType, over: Partial<KitItem> = {}): KitItem {
	return { id: item.id * 10, item_type: item, person: null, quantity: 1, position: 1, ...over };
}

function bag(lines: KitItem[]): KitDetail {
	return { id: 3, name: 'Sac à langer', description: '', position: 1, items: lines };
}

function show(lines: KitItem[], persons: Person[] = [alice]) {
	return render(KitLines, {
		props: { household: 7, kit: bag(lines), persons, items: [tent, socks, map], onchanged }
	});
}

function card(name: string): HTMLElement {
	return screen.getByText(name).closest('li[data-row]') as HTMLElement;
}

function names(): string[] {
	return screen.getAllByTestId('kit-item-name').map((one) => one.textContent?.trim() ?? '');
}

type User = ReturnType<typeof userEvent.setup>;

async function openFilters(user: User) {
	await user.click(screen.getByTestId('trip-filters-open'));
	await screen.findByRole('dialog');
}

async function closeFilters(user: User) {
	await user.click(screen.getByRole('button', { name: 'Fermer' }));
	await vi.waitFor(() => {
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.body.style.pointerEvents).not.toBe('none');
	});
}

function filterRow(title: string): HTMLElement {
	return screen.getByRole('group', { name: title });
}

async function filterBy(user: User, name: string) {
	await openFilters(user);
	await user.click(within(filterRow('Personnes')).getByRole('button', { name }));
	await closeFilters(user);
}

function unfoldAdd(user: ReturnType<typeof userEvent.setup>, name: string) {
	return user.click(screen.getByRole('button', { name: `Ajouter une ligne à « ${name} »` }));
}

async function choose(name: string) {
	const user = userEvent.setup();
	await user.click(screen.getByRole('combobox'));
	await user.keyboard(name);
	await user.click(screen.getAllByRole('option')[0]);
}

async function importAlongside(item: ItemType, held: ItemType) {
	const user = userEvent.setup();
	vi.mocked(createItemType)
		.mockResolvedValueOnce({ item, created: true })
		.mockResolvedValueOnce({ item: held, created: false });
	await user.click(screen.getByRole('combobox'));
	await user.paste(`${item.name}\n${held.name}`);
	await user.click(await screen.findByTestId('item-import-start'));
	await screen.findByTestId('item-import-created');
}

describe('KitLines', () => {
	it('attribue à l’unique personne du foyer l’objet choisi, sans rien demander', async () => {
		show([line(socks)]);

		await choose('Tente');

		expect(createKitItem).toHaveBeenCalledWith(7, 3, { item_type: tent.id, person: alice.id });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('ajoute pour tout le monde l’objet choisi dès que le foyer compte deux personnes', async () => {
		show([line(socks)], [alice, bob]);

		await choose('Tente');

		expect(createKitItem).toHaveBeenCalledWith(7, 3, { item_type: tent.id, person: null });
	});

	it('attribue à l’unique personne du foyer les objets importés', async () => {
		show([line(socks)]);

		await importAlongside(tent, socks);

		expect(vi.mocked(createKitItem).mock.calls).toEqual([
			[7, 3, { item_type: tent.id, person: alice.id }]
		]);
	});

	it('pointe l’objet déjà dans le kit au lieu de le rajouter', async () => {
		show([line(tent)]);

		await choose('Tente');

		expect(createKitItem).not.toHaveBeenCalled();
		expect(screen.getByText('Tente').closest('li[data-row]')).toHaveClass('border-primary');
	});

	it('ne déplie la rangée d’ajout que de la carte dont on tape le +', async () => {
		const user = userEvent.setup();
		show([line(tent), line(socks)]);

		expect(
			screen.queryByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).not.toBeInTheDocument();

		await unfoldAdd(user, 'Tente');
		expect(
			within(card('Tente')).getByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).toBeVisible();
		expect(
			within(card('Chaussettes')).queryByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).not.toBeInTheDocument();

		await unfoldAdd(user, 'Chaussettes');
		expect(
			within(card('Chaussettes')).getByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).toBeVisible();
		expect(
			within(card('Tente')).queryByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).not.toBeInTheDocument();

		await user.click(
			within(card('Chaussettes')).getByRole('button', { name: 'Ajouter une ligne pour Alice' })
		);
		expect(createKitItem).toHaveBeenCalledWith(7, 3, { item_type: socks.id, person: alice.id });
	});

	it('allume le bouton de la carte dépliée, et lui seul', async () => {
		const user = userEvent.setup();
		show([line(tent), line(socks)]);

		const opener = (name: string) =>
			screen.getByRole('button', { name: `Ajouter une ligne à « ${name} »` });

		expect(opener('Tente')).toHaveClass('text-muted-foreground');
		expect(opener('Tente')).not.toHaveClass('bg-accent');

		await unfoldAdd(user, 'Tente');

		expect(opener('Tente')).toHaveClass('bg-accent', 'text-primary');
		expect(opener('Tente')).not.toHaveClass('text-muted-foreground');
		expect(opener('Chaussettes')).not.toHaveClass('bg-accent');

		await unfoldAdd(user, 'Chaussettes');

		expect(opener('Chaussettes')).toHaveClass('bg-accent', 'text-primary');
		expect(opener('Tente')).not.toHaveClass('bg-accent');
	});

	it('replie la rangée d’ajout quand l’objet n’a plus personne à proposer', async () => {
		const user = userEvent.setup();
		const common = line(tent);
		const { rerender } = render(KitLines, {
			props: {
				household: 7,
				kit: bag([common]),
				persons: [alice],
				items: [tent, socks],
				onchanged
			}
		});

		await unfoldAdd(user, 'Tente');
		expect(screen.getByRole('button', { name: 'Ajouter une ligne à « Tente »' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);

		// Alice prise, l'objet n'a plus personne à proposer : le + s'en va.
		await rerender({ kit: bag([common, line(tent, { id: 11, person: alice })]) });
		expect(
			screen.queryByRole('button', { name: 'Ajouter une ligne à « Tente »' })
		).not.toBeInTheDocument();

		// Sa ligne retirée, il en a de nouveau — mais la rangée reste repliée.
		await rerender({ kit: bag([common]) });
		expect(screen.getByRole('button', { name: 'Ajouter une ligne à « Tente »' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		expect(
			screen.queryByRole('button', { name: 'Ajouter une ligne pour Alice' })
		).not.toBeInTheDocument();
	});

	it('ne dessine le + que sur les cartes où il reste quelqu’un à ajouter', () => {
		show([line(tent), line(tent, { id: 11, person: alice }), line(socks)]);

		expect(
			within(card('Chaussettes')).getByRole('button', {
				name: 'Ajouter une ligne à « Chaussettes »'
			})
		).toBeVisible();
		expect(
			within(card('Tente')).queryByRole('button', { name: /Ajouter une ligne à/ })
		).not.toBeInTheDocument();
	});

	it('n’ouvre l’éditeur que depuis le crayon, jamais depuis le nom de l’objet', async () => {
		const user = userEvent.setup();
		show([line(tent)]);

		await user.click(screen.getByText('Tente'));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Modifier l’objet « Tente »' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});
});

describe('KitLines : filtre par personne', () => {
	it('range la seule rangée des personnes derrière un bouton', async () => {
		const user = userEvent.setup();
		show([line(tent), line(socks, { person: alice }), line(map, { person: bob })], [alice, bob]);

		expect(screen.getByTestId('trip-filters-open')).toHaveTextContent('');
		expect(screen.getByRole('button', { name: 'Filtres' })).toBeVisible();
		expect(screen.queryByRole('group', { name: 'Personnes' })).not.toBeInTheDocument();

		await openFilters(user);

		expect(filterRow('Personnes')).toBeVisible();
		expect(screen.queryByRole('group', { name: 'Kits' })).not.toBeInTheDocument();
		expect(screen.queryByRole('group', { name: 'Statuts' })).not.toBeInTheDocument();
	});

	it('ne propose que les personnes qu’une ligne du kit nomme', async () => {
		const user = userEvent.setup();
		show(
			[line(tent), line(socks, { person: alice }), line(map, { person: bob })],
			[alice, bob, chloe]
		);

		await openFilters(user);

		const row = filterRow('Personnes');
		expect(within(row).getByRole('button', { name: 'Tous' })).toBeVisible();
		expect(within(row).getByRole('button', { name: 'Alice' })).toBeVisible();
		expect(within(row).getByRole('button', { name: 'Bob' })).toBeVisible();
		expect(within(row).queryByRole('button', { name: 'Chloé' })).not.toBeInTheDocument();
	});

	it('ne propose pas de filtres quand une seule personne est nommée', () => {
		show([line(tent), line(socks, { person: alice })], [alice, bob]);

		expect(screen.queryByTestId('trip-filters-open')).not.toBeInTheDocument();
	});

	it('retire le bouton et oublie le choix quand la rangée ne nomme plus qu’une personne', async () => {
		const user = userEvent.setup();
		const forAlice = line(socks, { person: alice });
		const forBob = line(tent, { person: bob });
		const { rerender } = show([forAlice, forBob], [alice, bob]);

		await filterBy(user, 'Alice');
		expect(screen.getByTestId('trip-filters-open')).toHaveTextContent('1');

		await rerender({ kit: bag([forAlice, line(map)]) });
		expect(screen.queryByTestId('trip-filters-open')).not.toBeInTheDocument();
		expect(names()).toEqual(['Chaussettes', 'Carte']);
	});

	it('cache le bouton des filtres pendant une recherche', async () => {
		const user = userEvent.setup();
		show([line(socks, { person: alice })]);

		await user.click(screen.getByRole('combobox'));
		await user.keyboard('Tente');

		expect(screen.queryByTestId('trip-filters-open')).not.toBeInTheDocument();
	});

	it('ne garde que les lignes de la personne retenue et les communes', async () => {
		const user = userEvent.setup();
		show(
			[
				line(socks, { person: alice }),
				line(socks, { id: 21, person: bob }),
				line(tent),
				line(map, { person: bob })
			],
			[alice, bob]
		);

		await filterBy(user, 'Alice');

		expect(names()).toEqual(['Chaussettes', 'Tente']);
		expect(within(card('Chaussettes')).getByText('Alice')).toBeVisible();
		expect(within(card('Chaussettes')).queryByText('Bob')).not.toBeInTheDocument();
		expect(screen.getByTestId('trip-filters-open')).toHaveTextContent('1');
		expect(screen.getByRole('button', { name: 'Filtres — actifs : 1' })).toBeInTheDocument();
	});

	it('cesse de compter un choix dont la personne n’a plus de ligne, et le retrouve avec elle', async () => {
		const user = userEvent.setup();
		const forAlice = line(socks, { person: alice });
		const forBob = line(tent, { person: bob });
		const { rerender } = show([forAlice, forBob], [alice, bob]);

		await filterBy(user, 'Alice');
		expect(names()).toEqual(['Chaussettes']);

		await rerender({ kit: bag([forBob]) });
		expect(screen.queryByTestId('trip-filters-open')).not.toBeInTheDocument();
		expect(names()).toEqual(['Tente']);
		expect(screen.queryByTestId('kit-empty')).not.toBeInTheDocument();

		await rerender({ kit: bag([forAlice, forBob]) });
		expect(screen.getByTestId('trip-filters-open')).toHaveTextContent('1');
		expect(names()).toEqual(['Chaussettes']);
	});

	it('ne propose d’ajouter une ligne qu’aux personnes retenues', async () => {
		const user = userEvent.setup();
		show([line(socks, { person: alice }), line(tent, { person: bob })], [alice, bob]);

		await filterBy(user, 'Alice');
		await unfoldAdd(user, 'Chaussettes');

		const row = card('Chaussettes');
		expect(
			within(row).getByRole('button', { name: 'Ajouter une ligne pour Tout le monde' })
		).toBeVisible();
		expect(
			within(row).queryByRole('button', { name: 'Ajouter une ligne pour Bob' })
		).not.toBeInTheDocument();
	});

	it('ne propose pas de recréer un objet qu’un filtre cache', async () => {
		const user = userEvent.setup();
		show([line(tent, { person: alice }), line(socks, { person: bob })], [alice, bob]);

		await filterBy(user, 'Alice');
		expect(names()).toEqual(['Tente']);

		await choose('Chaussettes');

		expect(createKitItem).not.toHaveBeenCalled();
		expect(names()).toEqual(['Tente', 'Chaussettes']);
		expect(card('Chaussettes')).toHaveClass('border-primary');
		expect(screen.getByTestId('trip-filters-open')).toHaveTextContent('');
	});

	it('ne déplace pas les lignes qu’un filtre cache', async () => {
		const ROW = 100;
		const hidden = line(map, { person: bob });
		const tentOne = line(tent, { person: alice });
		const socksOne = line(socks, { person: alice });
		show([hidden, tentOne, socksOne], [alice, bob]);

		const user = userEvent.setup();
		await filterBy(user, 'Alice');
		expect(names()).toEqual(['Tente', 'Chaussettes']);

		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			const row = this.getAttribute('data-row');
			if (!row) return new DOMRect(0, 0, 0, 0);
			return new DOMRect(0, (row === String(tent.id) ? 0 : 1) * ROW, 300, ROW);
		});

		await fireEvent.pointerDown(screen.getByTestId(`kit-item-handle-${socks.id}`), {
			pointerId: 1
		});
		await fireEvent.pointerMove(window, { pointerId: 1, clientY: ROW * 0.1 });
		await fireEvent.pointerUp(window, { pointerId: 1 });

		expect(vi.mocked(updateKitItem).mock.calls).toEqual([[7, 3, socksOne.id, { position: 1 }]]);
		vi.restoreAllMocks();
	});
});

describe('KitLines : surbrillance d’un objet déjà là', () => {
	it('ne laisse pas un ancien minuteur éteindre la surbrillance qu’on vient d’allumer', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		show([line(tent)]);

		const lit = async () => {
			await tick();
			return screen.getByText('Tente').closest('li[data-row]')?.className ?? '';
		};
		const point = async () => {
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('Tente');
			await user.click(screen.getAllByRole('option')[0]);
		};

		await point();
		expect(await lit()).toContain('border-primary');

		// Deux secondes plus tard on redésigne le même objet. Le minuteur du
		// premier passage arrive à échéance à 2,5 s : il ne doit pas éteindre ce
		// que le second vient d'allumer.
		vi.advanceTimersByTime(2000);
		await point();
		vi.advanceTimersByTime(1000);

		expect(await lit()).toContain('border-primary');
		vi.useRealTimers();
	});
});
