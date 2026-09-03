import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import KitLines from './KitLines.svelte';
import {
	createKitItem,
	type ItemType,
	type KitDetail,
	type KitItem,
	type Person
} from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createKitItem: vi.fn(),
	updateKitItem: vi.fn(),
	deleteKitItem: vi.fn()
}));

const tent: ItemType = { id: 1, name: 'Tente', description: 'Deux places' };
const socks: ItemType = { id: 2, name: 'Chaussettes', description: '' };

const alice: Person = { id: 1, name: 'Alice', user: null };

const onchanged = vi.fn().mockResolvedValue(undefined);

function line(item: ItemType, over: Partial<KitItem> = {}): KitItem {
	return { id: item.id * 10, item_type: item, person: null, quantity: 1, position: 1, ...over };
}

function bag(lines: KitItem[]): KitDetail {
	return { id: 3, name: 'Sac à langer', description: '', position: 1, items: lines };
}

function show(lines: KitItem[]) {
	render(KitLines, {
		props: { household: 7, kit: bag(lines), persons: [alice], items: [tent, socks], onchanged }
	});
}

function card(name: string): HTMLElement {
	return screen.getByText(name).closest('li[data-row]') as HTMLElement;
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

describe('KitLines', () => {
	it('ajoute une ligne pour tout le monde dès qu’un objet est choisi, sans rien demander', async () => {
		show([line(socks)]);

		await choose('Tente');

		expect(createKitItem).toHaveBeenCalledWith(7, 3, { item_type: tent.id, person: null });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
