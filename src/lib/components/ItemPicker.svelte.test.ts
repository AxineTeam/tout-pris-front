import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemPicker from './ItemPicker.svelte';
import * as api from '$lib/api.js';
import { catalog } from '$lib/catalog.svelte.js';

const createItemType = vi.spyOn(api, 'createItemType');

const chapeau = { id: 1, name: 'Chapeau', description: '' };
const echarpe = { id: 2, name: 'Écharpe', description: 'la rouge que Tom perd' };

beforeEach(() => {
	catalog.all = [chapeau, echarpe];
});

function show(held: number[] = []) {
	const onchosen = vi.fn();
	render(ItemPicker, { props: { household: 7, held, onchosen } });
	return onchosen;
}

async function type(user: ReturnType<typeof userEvent.setup>, letters: string) {
	await user.click(screen.getByRole('combobox'));
	await user.keyboard(letters);
}

const proposed = () => screen.getAllByRole('option').map((option) => option.textContent?.trim());

describe('ItemPicker', () => {
	it('ne propose rien tant que rien n’est saisi', () => {
		show();

		expect(screen.queryAllByRole('option')).toHaveLength(0);
	});

	it('n’annonce une liste ouverte qu’une fois la saisie commencée', async () => {
		const user = userEvent.setup();
		show();

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');

		await type(user, 'chap');

		expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
	});

	it('garde ses propositions hors de l’ordre de tabulation', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'chap');

		for (const option of screen.getAllByRole('option')) {
			expect(option).toHaveAttribute('tabindex', '-1');
		}
	});

	it('trouve un objet par le début de son nom', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'chap');

		expect(proposed()[0]).toContain('Chapeau');
	});

	it('trouve un objet dont les lettres sont espacées dans le nom', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'chpu');

		expect(proposed()[0]).toContain('Chapeau');
	});

	it('cherche sans les accents', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'echarpe');

		expect(proposed()[0]).toContain('Écharpe');
	});

	it('cherche aussi dans la description', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'rouge');

		expect(proposed()[0]).toContain('Écharpe');
	});

	it('propose la création en dernier, même quand un objet correspond', async () => {
		const user = userEvent.setup();
		show();

		await type(user, 'chap');

		expect(proposed().at(-1)).toContain('Créer « chap »');
	});

	it('marque un objet déjà dans le kit', async () => {
		const user = userEvent.setup();
		show([chapeau.id]);

		await type(user, 'chap');

		expect(proposed()[0]).toContain('déjà dans ce kit');
	});

	it('rend l’objet choisi sans rien créer', async () => {
		const user = userEvent.setup();
		const onchosen = show();

		await type(user, 'chap');
		await user.click(screen.getAllByRole('option')[0]);

		expect(onchosen).toHaveBeenCalledWith(chapeau);
		expect(createItemType).not.toHaveBeenCalled();
	});

	it('crée l’objet saisi et le rend', async () => {
		const user = userEvent.setup();
		createItemType.mockResolvedValue({
			item: { id: 3, name: 'Bob', description: '' },
			created: true
		});
		const onchosen = show();

		await type(user, 'Bob');
		await user.click(screen.getByTestId('item-create'));

		expect(createItemType).toHaveBeenCalledWith(7, 'Bob');
		expect(onchosen).toHaveBeenCalledWith({ id: 3, name: 'Bob', description: '' });
		expect(screen.queryByTestId('item-reused')).not.toBeInTheDocument();
	});

	it('ne crée qu’une fois quand on insiste pendant que l’API répond', async () => {
		const user = userEvent.setup();
		const bob = { id: 3, name: 'Bob', description: '' };
		createItemType.mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ item: bob, created: true }), 20))
		);
		show();

		await type(user, 'Bob');
		await user.click(screen.getByTestId('item-create'));
		await user.click(screen.getByTestId('item-create'));

		expect(createItemType).toHaveBeenCalledTimes(1);
	});

	it('dit sous quel nom l’API a rangé la saisie quand elle réutilise une entrée', async () => {
		const user = userEvent.setup();
		createItemType.mockResolvedValue({ item: chapeau, created: false });
		show();

		await type(user, 'chapeau');
		await user.click(screen.getByTestId('item-create'));

		expect(await screen.findByTestId('item-reused')).toHaveTextContent('Chapeau');
	});
});
