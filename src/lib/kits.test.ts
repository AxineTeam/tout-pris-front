import { describe, expect, it, vi } from 'vitest';
import * as api from '$lib/api.js';
import { copiedItems, copyKit } from '$lib/kits.js';

const readKit = vi.spyOn(api, 'readKit');
const createKit = vi.spyOn(api, 'createKit');
const deleteKit = vi.spyOn(api, 'deleteKit');
const createItemType = vi.spyOn(api, 'createItemType');
const createKitItem = vi.spyOn(api, 'createKitItem');

const item = (id: number, name: string) => ({ id, name, description: '' });

const person = (id: number, name: string) => ({ id, name, user: null });

function line(id: number, of: api.ItemType, quantity: number, who: api.Person | null = null) {
	return { id, item_type: of, person: who, quantity, position: id };
}

function sourceKit(lines: api.KitItem[], name = 'Trousse', description = 'Pour la salle de bain') {
	readKit.mockResolvedValue({ id: 3, name, description, position: 0, items: lines });
	createKit.mockResolvedValue({ id: 9, name, description, position: 0 });
	deleteKit.mockResolvedValue(undefined);
}

function lands(id: number, name: string) {
	createItemType.mockResolvedValue({ item: item(id, name), created: true });
	createKitItem.mockResolvedValue(line(1, item(id, name), 1));
}

function copies(overrides: Partial<Parameters<typeof copyKit>[0]> = {}) {
	return copyKit({ household: 7, kit: 3, destination: 8, progressed: vi.fn(), ...overrides });
}

function landedNames() {
	return createItemType.mock.calls.map(([, name]) => name);
}

describe('copiedItems', () => {
	it('additionne en une ligne les lignes que les personnes séparaient', () => {
		const couches = item(1, 'Couches');
		const merged = copiedItems([
			line(1, couches, 1, person(1, 'Léa')),
			line(2, couches, 2, person(2, 'Paul')),
			line(3, couches, 1)
		]);

		expect(merged).toEqual([{ item: couches, quantity: 4 }]);
	});

	it('garde les objets dans l’ordre du kit, à leur première ligne', () => {
		const couches = item(1, 'Couches');
		const lingettes = item(2, 'Lingettes');
		const merged = copiedItems([
			line(1, couches, 1, person(1, 'Léa')),
			line(2, lingettes, 1),
			line(3, couches, 1)
		]);

		expect(merged).toEqual([
			{ item: couches, quantity: 2 },
			{ item: lingettes, quantity: 1 }
		]);
	});

	it('ne rend rien d’un kit vide', () => {
		expect(copiedItems([])).toEqual([]);
	});
});

describe('copyKit', () => {
	it('recrée le kit avec le nom et la description de la source', async () => {
		sourceKit([], 'Trousse', 'Pour la salle de bain');

		await copies();

		expect(createKit).toHaveBeenCalledWith(8, 'Trousse', 'Pour la salle de bain');
	});

	it('crée les objets à l’envers, pour que le kit d’arrivée se lise comme la source', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		createItemType.mockImplementation(async (household, name) => ({
			item: item(name === 'Couches' ? 11 : 12, name),
			created: true
		}));
		createKitItem.mockResolvedValue(line(1, item(11, 'Couches'), 1));

		await copies();

		expect(landedNames()).toEqual(['Lingettes', 'Couches']);
		expect(createKitItem.mock.calls.map(([, , posted]) => posted.item_type)).toEqual([12, 11]);
	});

	it('pose une seule ligne commune par objet, de la quantité que ses lignes totalisaient', async () => {
		const couches = item(1, 'Couches');
		sourceKit([line(1, couches, 1, person(1, 'Léa')), line(2, couches, 2)]);
		lands(11, 'Couches');

		await copies();

		expect(createKitItem.mock.calls).toEqual([
			[8, 9, { item_type: 11, person: null, quantity: 3 }]
		]);
	});

	it('compte les objets arrivés dans le kit d’arrivée', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		lands(11, 'Couches');

		expect(await copies()).toEqual({ copied: 2, refused: [], moved: false });
	});

	it('poursuit après un objet refusé, dit lequel et pourquoi, dans l’ordre du kit', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		createItemType
			.mockResolvedValueOnce({ item: item(12, 'Lingettes'), created: true })
			.mockRejectedValueOnce(new api.ApiError(400, { name: ['Ce nom est trop long.'] }, 'refusé'));
		createKitItem.mockResolvedValue(line(1, item(12, 'Lingettes'), 1));

		expect(await copies()).toEqual({
			copied: 1,
			refused: [{ name: 'Couches', message: 'Ce nom est trop long.' }],
			moved: false
		});
	});

	it('range en refus l’objet créé au catalogue dont le kit a repoussé la ligne', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1)]);
		createItemType.mockResolvedValue({ item: item(11, 'Couches'), created: true });
		createKitItem.mockRejectedValue(new api.ApiError(400, 'Kit plein.', 'refusé'));

		expect(await copies()).toEqual({
			copied: 0,
			refused: [{ name: 'Couches', message: 'Kit plein.' }],
			moved: false
		});
	});

	it('s’arrête entre deux objets, jamais au milieu d’un', async () => {
		sourceKit([
			line(1, item(1, 'Couches'), 1),
			line(2, item(2, 'Lingettes'), 1),
			line(3, item(3, 'Gourde'), 1)
		]);
		createItemType.mockResolvedValue({ item: item(11, 'Gourde'), created: true });
		let stop = false;
		createKitItem.mockImplementation(async () => {
			stop = true;
			return line(1, item(11, 'Gourde'), 1);
		});

		// Le dernier objet du kit est le premier créé : il a eu sa ligne avant que
		// l'arrêt ne compte, et les deux autres n'ont jamais été demandés.
		expect(await copies({ stopped: () => stop })).toEqual({
			copied: 1,
			refused: [],
			moved: false
		});
		expect(landedNames()).toEqual(['Gourde']);
	});

	it('annonce le total avant de créer quoi que ce soit, puis avance objet par objet', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		lands(11, 'Couches');
		const progressed = vi.fn();

		await copies({ progressed });

		expect(progressed.mock.calls).toEqual([
			[0, 2],
			[1, 2],
			[2, 2]
		]);
	});

	it('ne pose aucun kit dans le foyer d’arrivée quand l’arrêt tombe avant sa création', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1)]);

		expect(await copies({ stopped: () => true })).toEqual({
			copied: 0,
			refused: [],
			moved: false
		});
		expect(createKit).not.toHaveBeenCalled();
		expect(createItemType).not.toHaveBeenCalled();
	});

	it('laisse remonter le refus d’écrire dans le foyer d’arrivée', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1)]);
		createKit.mockRejectedValue(
			new api.ApiError(403, 'Choose which person you are in this household first.', 'refusé')
		);

		await expect(copies()).rejects.toBeInstanceOf(api.ApiError);
		expect(createItemType).not.toHaveBeenCalled();
	});

	it('ne supprime jamais le kit de départ sans qu’on ait demandé un déplacement', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1)]);
		lands(11, 'Couches');

		expect((await copies()).moved).toBe(false);
		expect(deleteKit).not.toHaveBeenCalled();
	});

	it('supprime le kit de départ une fois tous ses objets arrivés', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1)]);
		lands(11, 'Couches');

		expect(await copies({ move: true })).toEqual({ copied: 1, refused: [], moved: true });
		expect(deleteKit).toHaveBeenCalledWith(7, 3);
	});

	it('garde le kit de départ dès qu’un objet a été refusé', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		createItemType
			.mockResolvedValueOnce({ item: item(12, 'Lingettes'), created: true })
			.mockRejectedValueOnce(new api.ApiError(400, 'Ce nom est trop long.', 'refusé'));
		createKitItem.mockResolvedValue(line(1, item(12, 'Lingettes'), 1));

		expect((await copies({ move: true })).moved).toBe(false);
		expect(deleteKit).not.toHaveBeenCalled();
	});

	it('garde le kit de départ quand la copie s’est arrêtée en chemin', async () => {
		sourceKit([line(1, item(1, 'Couches'), 1), line(2, item(2, 'Lingettes'), 1)]);
		createItemType.mockResolvedValue({ item: item(12, 'Lingettes'), created: true });
		let stop = false;
		createKitItem.mockImplementation(async () => {
			stop = true;
			return line(1, item(12, 'Lingettes'), 1);
		});

		expect((await copies({ move: true, stopped: () => stop })).moved).toBe(false);
		expect(deleteKit).not.toHaveBeenCalled();
	});
});
