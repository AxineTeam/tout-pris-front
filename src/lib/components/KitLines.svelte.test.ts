import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

function show(lines: KitItem[]) {
	const kit: KitDetail = {
		id: 3,
		name: 'Sac à langer',
		description: '',
		position: 1,
		items: lines
	};
	render(KitLines, {
		props: { household: 7, kit, persons: [alice], items: [tent, socks], onchanged }
	});
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
});
