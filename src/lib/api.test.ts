import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createStuffList, deleteStuffList, listStuffLists } from './api.js';

function mockFetch(response: Partial<Response>) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		status: 200,
		json: () => Promise.resolve([]),
		...response
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('listStuffLists', () => {
	it('appelle GET /api/stufflists et renvoie le JSON', async () => {
		const lists = [{ id: 1, name: 'Courses' }];
		const fetchMock = mockFetch({ json: () => Promise.resolve(lists) });

		await expect(listStuffLists()).resolves.toEqual(lists);
		expect(fetchMock).toHaveBeenCalledWith('/api/stufflists', expect.anything());
	});

	it('lève une ApiError avec le statut HTTP en cas d’échec', async () => {
		mockFetch({ ok: false, status: 500 });

		await expect(listStuffLists()).rejects.toMatchObject({
			name: 'ApiError',
			status: 500
		});
		await expect(listStuffLists()).rejects.toBeInstanceOf(ApiError);
	});
});

describe('createStuffList', () => {
	it('envoie le payload en POST', async () => {
		const created = { id: 2, name: 'Vacances' };
		const fetchMock = mockFetch({ json: () => Promise.resolve(created) });

		await expect(createStuffList({ name: 'Vacances' })).resolves.toEqual(created);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/stufflists',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ name: 'Vacances' })
			})
		);
	});
});

describe('deleteStuffList', () => {
	it('appelle DELETE /api/stufflists/{id} et gère le 204 sans corps', async () => {
		const fetchMock = mockFetch({ status: 204 });

		await expect(deleteStuffList(3)).resolves.toBeUndefined();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/stufflists/3',
			expect.objectContaining({ method: 'DELETE' })
		);
	});
});
