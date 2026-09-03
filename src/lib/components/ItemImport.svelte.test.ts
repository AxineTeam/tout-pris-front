import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemImport from './ItemImport.svelte';
import * as api from '$lib/api.js';

const createItemType = vi.spyOn(api, 'createItemType');

const item = (id: number, name: string) => ({ id, name, description: '' });

function show(pasted: string, held: number[] = []) {
	const onadopt = vi.fn().mockResolvedValue(undefined);
	const onrefresh = vi.fn().mockResolvedValue(undefined);
	const onclose = vi.fn();
	render(ItemImport, {
		props: { household: 7, held, pasted, onadopt, onrefresh, onclose }
	});
	return { onadopt, onrefresh, onclose };
}

const start = () => screen.getByTestId('item-import-start');

describe('ItemImport', () => {
	it('explique comment coller quand rien n’a été collé', () => {
		show('');

		expect(screen.queryByTestId('item-import-start')).not.toBeInTheDocument();
		expect(screen.getByTestId('item-import')).toHaveTextContent('Une ligne, un objet');
	});

	it('annonce le nombre d’objets détectés', () => {
		show('Tente\nSac\nGourde');

		expect(screen.getByTestId('item-import-detected')).toHaveTextContent('3');
	});

	it('annonce sur son bouton le nombre d’objets qu’il va ajouter', () => {
		show('Tente\nSac\nGourde');

		expect(start()).toHaveTextContent('3');
	});

	it('montre les premiers noms pour que la liste se reconnaisse', () => {
		show('Tente\nSac\nGourde');

		expect(screen.getByTestId('item-import')).toHaveTextContent('Tente');
		expect(screen.getByTestId('item-import')).toHaveTextContent('Gourde');
	});

	it('refuse d’importer au-delà de cent objets et dit le compte', () => {
		show(Array.from({ length: 101 }, (unused, at) => `Objet ${at}`).join('\n'));

		expect(screen.getByTestId('item-import-too-many')).toHaveTextContent('101');
		expect(screen.queryByTestId('item-import-start')).not.toBeInTheDocument();
	});

	it('refuse un collage trop gros sans chercher à le découper en objets', () => {
		show('Objet\n'.repeat(20_000));

		expect(screen.getByTestId('item-import-too-big')).toBeInTheDocument();
		expect(screen.queryByTestId('item-import-start')).not.toBeInTheDocument();
	});

	it('récapitule ce qui a été créé et ce qui était déjà là', async () => {
		const user = userEvent.setup();
		createItemType
			.mockResolvedValueOnce({ item: item(1, 'Tente'), created: true })
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: false });
		show('Tente\nSac');

		await user.click(start());

		expect(await screen.findByTestId('item-import-created')).toHaveTextContent('1');
		expect(screen.getByTestId('item-import-reused')).toHaveTextContent('1');
		expect(screen.getByTestId('item-import-refused')).toHaveTextContent('0');
	});

	it('annonce le récapitulatif dans une région qui existait avant lui', async () => {
		const user = userEvent.setup();
		createItemType.mockResolvedValue({ item: item(1, 'Tente'), created: true });
		show('Tente');
		const live = screen.getByRole('status');

		await user.click(start());
		await screen.findByTestId('item-import-created');

		expect(live).toContainElement(screen.getByTestId('item-import-created'));
	});

	it('poursuit après une ligne refusée et en donne la raison', async () => {
		const user = userEvent.setup();
		createItemType
			.mockRejectedValueOnce(new api.ApiError(400, { name: ['Ce nom est trop long.'] }, 'refusé'))
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: true });
		show('Tente\nSac');

		await user.click(start());

		expect(await screen.findByTestId('item-import-refused')).toHaveTextContent('1');
		expect(screen.getByTestId('item-import-created')).toHaveTextContent('1');
		expect(screen.getByTestId('item-import')).toHaveTextContent('Ce nom est trop long.');
	});

	it('ajoute à la collection les objets qu’elle ne portait pas, puis la rafraîchit une fois', async () => {
		const user = userEvent.setup();
		const tente = item(1, 'Tente');
		createItemType
			.mockResolvedValueOnce({ item: tente, created: true })
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: false });
		const { onadopt, onrefresh } = show('Tente\nSac', [2]);

		await user.click(start());
		await screen.findByTestId('item-import-created');

		expect(onadopt.mock.calls).toEqual([[tente]]);
		expect(onrefresh).toHaveBeenCalledTimes(1);
	});

	it('fermer arrête la boucle entre deux objets et rafraîchit quand même', async () => {
		const user = userEvent.setup();
		const tente = item(1, 'Tente');
		let serve: (outcome: api.ItemTypeOutcome) => void = () => {};
		createItemType
			.mockReturnValueOnce(new Promise((resolve) => (serve = resolve)))
			.mockResolvedValue({ item: item(2, 'Sac'), created: true });
		const { onadopt, onrefresh, onclose } = show('Tente\nSac');

		await user.click(start());
		await screen.findByTestId('item-import-progress');
		// La fermeture tombe pendant que le premier objet est en vol.
		await user.keyboard('{Escape}');
		serve({ item: tente, created: true });

		expect(onclose).toHaveBeenCalled();
		await vi.waitFor(() => expect(onrefresh).toHaveBeenCalledTimes(1));
		// Le premier est allé au bout de sa ligne, le second n'a jamais été demandé.
		expect(onadopt.mock.calls).toEqual([[tente]]);
		expect(createItemType).toHaveBeenCalledTimes(1);
	});
});
