// Client HTTP du backend tout-pris-back (FastAPI).
// Le front et le back sont servis depuis la même origine : en production le
// reverse proxy nginx route /api vers FastAPI, en dev/preview c'est le proxy
// Vite (voir vite.config.ts). Pas de CORS, pas d'URL absolue.
export const API_BASE = '/api';

export interface StuffList {
	id: number;
	name: string;
}

export interface StuffListCreate {
	name: string;
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...init
	});
	if (!response.ok) {
		throw new ApiError(response.status, `${init?.method ?? 'GET'} ${path} → ${response.status}`);
	}
	if (response.status === 204) return undefined as T;
	return response.json();
}

export function getHealth(): Promise<{ status: string }> {
	return request('/health');
}

export function listStuffLists(): Promise<StuffList[]> {
	return request('/stufflists');
}

export function createStuffList(payload: StuffListCreate): Promise<StuffList> {
	return request('/stufflists', { method: 'POST', body: JSON.stringify(payload) });
}

export function getStuffList(id: number): Promise<StuffList> {
	return request(`/stufflists/${id}`);
}

export function deleteStuffList(id: number): Promise<void> {
	return request(`/stufflists/${id}`, { method: 'DELETE' });
}
