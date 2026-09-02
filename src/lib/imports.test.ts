import { describe, expect, it, vi } from 'vitest';
import * as api from '$lib/api.js';
import * as catalog from '$lib/catalog.js';
import { importItems, parseItems } from '$lib/imports.js';

const createItemType = vi.spyOn(api, 'createItemType');
const rewriteItems = vi.spyOn(catalog, 'rewriteItems').mockImplementation(() => {});

const item = (id: number, name: string) => ({ id, name, description: '' });

describe('parseItems', () => {
	it('fait un objet de chaque ligne', () => {
		expect(parseItems('Tente\nSac\nGourde').map((one) => one.name)).toEqual([
			'Tente',
			'Sac',
			'Gourde'
		]);
	});

	it('garde la ligne entière pour nom, point-virgules compris', () => {
		expect(parseItems('Crème solaire;Indice 50')).toEqual([
			{ line: 1, name: 'Crème solaire;Indice 50' }
		]);
	});

	it('rogne les espaces de bord du nom', () => {
		expect(parseItems('  Tente  ')).toEqual([{ line: 1, name: 'Tente' }]);
	});

	it('ignore les lignes vides sans décaler les numéros de ligne', () => {
		expect(parseItems('Tente\n\n   \nSac')).toEqual([
			{ line: 1, name: 'Tente' },
			{ line: 4, name: 'Sac' }
		]);
	});

	it('coupe aussi sur les fins de ligne de Windows', () => {
		expect(parseItems('Tente\r\nSac').map((one) => one.name)).toEqual(['Tente', 'Sac']);
	});

	it('coupe sur un retour chariot seul', () => {
		expect(parseItems('Tente\rSac').map((one) => one.name)).toEqual(['Tente', 'Sac']);
	});

	it('ne garde qu’un objet quand un nom se répète à la casse et aux espaces près', () => {
		expect(parseItems('Tente\n  tENTE  ').map((one) => one.name)).toEqual(['Tente']);
	});

	it('garde deux objets quand seuls les accents les séparent, comme l’API', () => {
		expect(parseItems('Crème\nCreme').map((one) => one.name)).toEqual(['Crème', 'Creme']);
	});

	it('ne rend rien d’un texte sans nom', () => {
		expect(parseItems('\n   \n')).toEqual([]);
	});
});

describe('importItems', () => {
	function run(text: string, held: number[] = []) {
		const adopt = vi.fn().mockResolvedValue(undefined);
		const progressed = vi.fn();
		const report = importItems({
			household: 7,
			wanted: parseItems(text),
			held,
			adopt,
			progressed
		});
		return { report, adopt, progressed };
	}

	it('sépare les objets créés de ceux que l’API a retrouvés', async () => {
		createItemType
			.mockResolvedValueOnce({ item: item(1, 'Tente'), created: true })
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: false });

		const { report } = run('Tente\nSac');

		expect(await report).toEqual({ created: 1, reused: 1, refused: [] });
	});

	it('ajoute à la collection chaque objet qu’elle ne portait pas', async () => {
		const tente = item(1, 'Tente');
		const sac = item(2, 'Sac');
		createItemType
			.mockResolvedValueOnce({ item: tente, created: true })
			.mockResolvedValueOnce({ item: sac, created: true });

		const { report, adopt } = run('Tente\nSac');
		await report;

		expect(adopt.mock.calls).toEqual([[tente], [sac]]);
	});

	it('compte parmi les déjà présents un objet que la collection porte, sans l’ajouter deux fois', async () => {
		createItemType.mockResolvedValue({ item: item(1, 'Tente'), created: false });

		const { report, adopt } = run('Tente', [1]);

		expect(await report).toEqual({ created: 0, reused: 1, refused: [] });
		expect(adopt).not.toHaveBeenCalled();
	});

	it('poursuit après une ligne refusée et dit laquelle et pourquoi', async () => {
		createItemType
			.mockRejectedValueOnce(new api.ApiError(400, { name: ['Ce nom est trop long.'] }, 'refusé'))
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: true });

		const { report } = run('Tente\nSac');

		expect(await report).toEqual({
			created: 1,
			reused: 0,
			refused: [{ line: 1, name: 'Tente', message: 'Ce nom est trop long.' }]
		});
	});

	it('range en refus une ligne créée au catalogue que la collection a repoussée', async () => {
		createItemType.mockResolvedValue({ item: item(1, 'Tente'), created: true });
		const adopt = vi.fn().mockRejectedValue(new api.ApiError(400, 'Kit plein.', 'refusé'));

		const report = await importItems({
			household: 7,
			wanted: parseItems('Tente'),
			held: [],
			adopt,
			progressed: vi.fn()
		});

		expect(report).toEqual({
			created: 0,
			reused: 0,
			refused: [{ line: 1, name: 'Tente', message: 'Kit plein.' }]
		});
	});

	it('n’écrit le catalogue qu’une fois, avec tous les objets rassemblés', async () => {
		const tente = item(1, 'Tente');
		const sac = item(2, 'Sac');
		createItemType
			.mockResolvedValueOnce({ item: tente, created: true })
			.mockResolvedValueOnce({ item: sac, created: false });

		await run('Tente\nSac').report;

		expect(rewriteItems).toHaveBeenCalledTimes(1);
		expect(rewriteItems.mock.calls[0][0]).toBe(7);
		expect(rewriteItems.mock.calls[0][1]([])).toEqual([tente, sac]);
	});

	it('laisse le catalogue tranquille quand tout a été refusé', async () => {
		createItemType.mockRejectedValue(new api.ApiError(400, 'refusé', 'refusé'));

		await run('Tente\nSac').report;

		expect(rewriteItems).not.toHaveBeenCalled();
	});

	it('s’arrête entre deux objets, jamais au milieu d’un', async () => {
		const tente = item(1, 'Tente');
		createItemType.mockResolvedValue({ item: tente, created: true });
		let stop = false;
		const adopt = vi.fn().mockImplementation(() => {
			stop = true;
			return Promise.resolve();
		});

		const report = await importItems({
			household: 7,
			wanted: parseItems('Tente\nSac\nGourde'),
			held: [],
			adopt,
			progressed: vi.fn(),
			stopped: () => stop
		});

		// Le premier objet a eu sa création et sa ligne avant que l'arrêt ne compte.
		expect(report).toEqual({ created: 1, reused: 0, refused: [] });
		expect(createItemType).toHaveBeenCalledTimes(1);
		expect(adopt).toHaveBeenCalledTimes(1);
	});

	it('écrit au cache ce qu’elle avait rassemblé avant l’arrêt', async () => {
		const tente = item(1, 'Tente');
		createItemType.mockResolvedValue({ item: tente, created: true });
		let stop = false;

		await importItems({
			household: 7,
			wanted: parseItems('Tente\nSac'),
			held: [],
			adopt: () => {
				stop = true;
				return Promise.resolve();
			},
			progressed: vi.fn(),
			stopped: () => stop
		});

		expect(rewriteItems).toHaveBeenCalledTimes(1);
		expect(rewriteItems.mock.calls[0][1]([])).toEqual([tente]);
	});

	it('avance ligne à ligne, refus compris', async () => {
		createItemType
			.mockRejectedValueOnce(new api.ApiError(400, 'refusé', 'refusé'))
			.mockResolvedValueOnce({ item: item(2, 'Sac'), created: true });

		const { report, progressed } = run('Tente\nSac');
		await report;

		expect(progressed.mock.calls).toEqual([[1], [2]]);
	});
});
