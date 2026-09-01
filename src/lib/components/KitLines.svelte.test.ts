import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
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
