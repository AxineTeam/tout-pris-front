import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import KitCopy from './KitCopy.svelte';
import * as api from '$lib/api.js';

const readKit = vi.spyOn(api, 'readKit');
const createKit = vi.spyOn(api, 'createKit');
const deleteKit = vi.spyOn(api, 'deleteKit');
const createItemType = vi.spyOn(api, 'createItemType');
const createKitItem = vi.spyOn(api, 'createKitItem');

const item = (id: number, name: string) => ({ id, name, description: '' });

const line = (id: number, of: api.ItemType) => ({
	id,
	item_type: of,
	person: null,
	quantity: 1,
	position: id
});

const kit = { id: 3, name: 'Trousse', description: '', position: 0 };

function show(lines: api.KitItem[] = [], mode: 'copy' | 'move' = 'copy') {
	readKit.mockResolvedValue({ ...kit, items: lines });
	createKit.mockResolvedValue({ ...kit, id: 9 });
	deleteKit.mockResolvedValue(undefined);
	const onmoved = vi.fn();
	const onclose = vi.fn();
	render(KitCopy, {
		props: {
			household: 7,
			kit,
			households: [
				{ id: 7, name: 'Maison', personal: false },
				{ id: 8, name: 'Vacances', personal: false }
			],
			mode,
			onmoved,
			onclose
		}
	});
	return { onmoved, onclose };
}

const start = () => screen.getByTestId('kit-copy-start');

const pick = (user: ReturnType<typeof userEvent.setup>, label: string) =>
	user.click(screen.getByRole('button', { name: label }));

function lands(id: number, name: string) {
	createItemType.mockResolvedValue({ item: item(id, name), created: true });
	createKitItem.mockResolvedValue(line(1, item(id, name)));
}

describe('KitCopy', () => {
	it('propose les autres foyers, jamais celui d’où part le kit', () => {
		show();

		expect(
			screen.getByRole('button', { name: 'Copier vers le foyer Vacances' })
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Copier vers le foyer Maison' })
		).not.toBeInTheDocument();
	});

	it('attend qu’un foyer soit choisi avant de laisser copier', async () => {
		const user = userEvent.setup();
		show();

		expect(start()).toBeDisabled();
		await pick(user, 'Copier vers le foyer Vacances');

		expect(start()).toBeEnabled();
	});

	it('annonce le récapitulatif dans une région qui existait avant lui', async () => {
		const user = userEvent.setup();
		show([line(1, item(1, 'Couches'))]);
		lands(11, 'Couches');
		const live = screen.getByRole('status');

		await pick(user, 'Copier vers le foyer Vacances');
		await user.click(start());
		await screen.findByTestId('kit-copy-done');

		expect(live).toContainElement(screen.getByTestId('kit-copy-done'));
	});

	it('résume la copie en une phrase, avec le compte et le foyer d’arrivée', async () => {
		const user = userEvent.setup();
		show([line(1, item(1, 'Couches')), line(2, item(2, 'Lingettes'))]);
		lands(11, 'Couches');

		await pick(user, 'Copier vers le foyer Vacances');
		await user.click(start());

		expect(await screen.findByTestId('kit-copy-done')).toHaveTextContent(
			'2 objets copiés vers le foyer Vacances.'
		);
		expect(screen.queryByTestId('kit-copy-refusals')).not.toBeInTheDocument();
		expect(screen.queryByTestId('kit-copy-kept')).not.toBeInTheDocument();
	});

	it('accorde la phrase au singulier', async () => {
		const user = userEvent.setup();
		show([line(1, item(1, 'Couches'))]);
		lands(11, 'Couches');

		await pick(user, 'Copier vers le foyer Vacances');
		await user.click(start());

		expect(await screen.findByTestId('kit-copy-done')).toHaveTextContent(
			'1 objet copié vers le foyer Vacances.'
		);
	});

	it('dit le déplacement fait et prévient le parent que le kit est parti', async () => {
		const user = userEvent.setup();
		const { onmoved } = show([line(1, item(1, 'Couches'))], 'move');
		lands(11, 'Couches');

		await pick(user, 'Déplacer vers le foyer Vacances');
		await user.click(start());

		expect(await screen.findByTestId('kit-copy-done')).toHaveTextContent(
			'1 objet déplacé vers le foyer Vacances.'
		);
		expect(onmoved).toHaveBeenCalledTimes(1);
	});

	it('dit que le kit de départ est conservé quand un objet a été refusé', async () => {
		const user = userEvent.setup();
		const { onmoved } = show([line(1, item(1, 'Couches'))], 'move');
		createItemType.mockRejectedValue(new api.ApiError(400, 'Ce nom est trop long.', 'refusé'));

		await pick(user, 'Déplacer vers le foyer Vacances');
		await user.click(start());

		expect(await screen.findByTestId('kit-copy-kept')).toBeInTheDocument();
		expect(screen.getByTestId('kit-copy-done')).toHaveTextContent('0 objet copié');
		expect(screen.getByTestId('kit-copy-refusals')).toHaveTextContent('Ce nom est trop long.');
		expect(deleteKit).not.toHaveBeenCalled();
		expect(onmoved).not.toHaveBeenCalled();
	});

	it('laisse parler le refus d’écrire dans le foyer d’arrivée', async () => {
		const user = userEvent.setup();
		show([line(1, item(1, 'Couches'))]);
		createKit.mockRejectedValue(
			new api.ApiError(403, 'Choose which person you are in this household first.', 'refusé')
		);

		await pick(user, 'Copier vers le foyer Vacances');
		await user.click(start());

		expect(
			await screen.findByText('Choose which person you are in this household first.')
		).toBeInTheDocument();
	});

	it('fermer arrête la boucle entre deux objets', async () => {
		const user = userEvent.setup();
		let serve: (outcome: api.ItemTypeOutcome) => void = () => {};
		createItemType
			.mockReturnValueOnce(new Promise((resolve) => (serve = resolve)))
			.mockResolvedValue({ item: item(12, 'Lingettes'), created: true });
		createKitItem.mockResolvedValue(line(1, item(11, 'Couches')));
		const { onclose } = show([line(1, item(1, 'Couches')), line(2, item(2, 'Lingettes'))]);

		await pick(user, 'Copier vers le foyer Vacances');
		await user.click(start());
		await screen.findByTestId('kit-copy-progress');
		// La fermeture tombe pendant que le premier objet est en vol.
		await user.keyboard('{Escape}');
		serve({ item: item(11, 'Couches'), created: true });

		expect(onclose).toHaveBeenCalled();
		await vi.waitFor(() => expect(createKitItem).toHaveBeenCalledTimes(1));
		expect(createItemType).toHaveBeenCalledTimes(1);
	});

	it('le dit quand il n’y a pas d’autre foyer où copier', () => {
		readKit.mockResolvedValue({ ...kit, items: [] });
		render(KitCopy, {
			props: {
				household: 7,
				kit,
				households: [{ id: 7, name: 'Maison', personal: false }],
				mode: 'copy',
				onclose: vi.fn()
			}
		});

		expect(screen.getByTestId('kit-copy-alone')).toBeInTheDocument();
		expect(screen.queryByTestId('kit-copy-start')).not.toBeInTheDocument();
	});
});
