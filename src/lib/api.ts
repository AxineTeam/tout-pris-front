// Client HTTP du backend tout-pris-back (Django + DRF + django-allauth).
// Le front et le back sont servis depuis la même origine : en production le
// reverse proxy nginx route /api vers Django, en dev/preview c'est le proxy
// Vite (voir vite.config.ts). Pas de CORS, pas d'URL absolue.
export const API_BASE = '/api';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export function csrfToken(): string | null {
	const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : null;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const method = (init.method ?? 'GET').toUpperCase();
	const token = SAFE_METHODS.has(method) ? null : csrfToken();
	const response = await fetch(`${API_BASE}${path}`, {
		...init,
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { 'X-CSRFToken': token } : {}),
			...init.headers
		}
	});
	if (!response.ok) {
		throw new ApiError(response.status, `${method} ${path} → ${response.status}`);
	}
	if (response.status === 204) return undefined as T;
	return response.json();
}

export interface Health {
	status: string;
}

export function getHealth(): Promise<Health> {
	return request('/health/');
}
