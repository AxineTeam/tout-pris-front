import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemPicker from './ItemPicker.svelte';
import * as api from '$lib/api.js';

const createItemType = vi.spyOn(api, 'createItemType');

const chapeau = { id: 1, name: 'Chapeau', description: '' };
const echarpe = { id: 2, name: 'Écharpe', description: 'la rouge que Tom perd' };

function show(held: number[] = []) {
	const onchosen = vi.fn();
	render(ItemPicker, {
		props: {
			household: 7,
			items: [chapeau, echarpe],
			held,
			holding: 'déjà pris',
			onchosen,
			onadopt: vi.fn().mockResolvedValue(undefined),
			onrefresh: vi.fn().mockResolvedValue(undefined)
		}
	});
	return onchosen;
}

async function paste(user: ReturnType<typeof userEvent.setup>, text: string) {
	await user.click(screen.getByRole('combobox'));
	await user.paste(text);
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

		expect(proposed()[0]).toContain('déjà pris');
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

	it('ouvre l’import sur un collage de plusieurs lignes plutôt que de le saisir', async () => {
		const user = userEvent.setup();
		show();

		await paste(user, 'Chapeau\nGourde');

		expect(await screen.findByTestId('item-import-detected')).toHaveTextContent('2');
		expect(screen.getByTestId('item-field')).toHaveValue('');
	});

	it('laisse un collage d’un seul mot atterrir dans le champ', async () => {
		const user = userEvent.setup();
		show();

		await paste(user, 'Chapeau');

		expect(screen.queryByTestId('item-import')).not.toBeInTheDocument();
		expect(screen.getByTestId('item-field')).toHaveValue('Chapeau');
	});

	it('laisse un seul mot suivi d’un retour à la ligne atterrir dans le champ', async () => {
		const user = userEvent.setup();
		show();

		await paste(user, 'Chapeau\n');

		expect(screen.queryByTestId('item-import')).not.toBeInTheDocument();
		// Le champ mange lui-même le retour à la ligne, c'est tout l'intérêt de
		// le laisser passer plutôt que d'annuler le collage.
		expect(screen.getByTestId('item-field')).toHaveValue('Chapeau');
	});

	it('laisse un collage entièrement blanc atterrir dans le champ', async () => {
		const user = userEvent.setup();
		show();

		await paste(user, '\n\n  \n');

		expect(screen.queryByTestId('item-import')).not.toBeInTheDocument();
	});

	it('ouvre la même fenêtre en explication depuis le bouton du champ', async () => {
		const user = userEvent.setup();
		show();

		await user.click(screen.getByTestId('item-import-open'));

		expect(await screen.findByTestId('item-import')).toBeInTheDocument();
		expect(screen.queryByTestId('item-import-start')).not.toBeInTheDocument();
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
