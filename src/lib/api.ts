// Client HTTP du backend tout-pris-back (Django + DRF + django-allauth).
// Le front et le back sont servis depuis la même origine : en production le
// reverse proxy nginx route /api vers Django, en dev/preview c'est le proxy
// Vite (voir vite.config.ts). Pas de CORS, pas d'URL absolue.
export const API_BASE = '/api';
const AUTH_BASE = `${API_BASE}/auth/browser/v1`;

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

function methodOf(init: RequestInit): string {
	return (init.method ?? 'GET').toUpperCase();
}

function send(url: string, init: RequestInit): Promise<Response> {
	const token = SAFE_METHODS.has(methodOf(init)) ? null : csrfToken();
	return fetch(url, {
		...init,
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			...(token ? { 'X-CSRFToken': token } : {}),
			...init.headers
		}
	});
}

let sessionExpired: (() => void) | null = null;

export function onSessionExpired(handler: () => void) {
	sessionExpired = handler;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const method = methodOf(init);
	const response = await send(`${API_BASE}${path}`, init);
	if (response.status === 401) sessionExpired?.();
	if (!response.ok) {
		throw new ApiError(response.status, `${method} ${path} → ${response.status}`);
	}
	if (response.status === 204) return undefined as T;
	return response.json();
}

export interface AuthUser {
	id: number;
	display: string;
	email: string;
	has_usable_password: boolean;
}

export interface AuthFlow {
	id: string;
	is_pending?: boolean;
}

export interface AuthError {
	message: string;
	code: string;
	param?: string;
}

export interface AuthResponse {
	status: number;
	data?: { user?: AuthUser; flows?: AuthFlow[] };
	meta?: { is_authenticated?: boolean };
	errors?: AuthError[];
}

function isAuthResponse(body: unknown): body is AuthResponse {
	return (
		typeof body === 'object' && body !== null && typeof (body as AuthResponse).status === 'number'
	);
}

export async function authRequest(path: string, init: RequestInit = {}): Promise<AuthResponse> {
	const method = methodOf(init);
	const response = await send(`${AUTH_BASE}${path}`, init);
	const body = await response.json().catch(() => null);
	if (!isAuthResponse(body)) {
		throw new ApiError(response.status, `${method} ${path} → ${response.status}`);
	}
	return body;
}

export function authErrors(response: AuthResponse): AuthError[] {
	if (response.errors) return response.errors;
	if (response.status === 200 || response.meta) return [];
	if (response.status === 429) {
		return [{ message: 'Trop de tentatives, réessaie dans une minute.', code: 'rate_limited' }];
	}
	return [{ message: 'Le backend a refusé la demande.', code: 'refused' }];
}

export function readSession(): Promise<AuthResponse> {
	return authRequest('/auth/session');
}

export function logIn(email: string, password: string): Promise<AuthResponse> {
	return authRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function signUp(email: string, password: string): Promise<AuthResponse> {
	return authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function logOut(): Promise<AuthResponse> {
	return authRequest('/auth/session', { method: 'DELETE' });
}

export function readEmailVerification(key: string): Promise<AuthResponse> {
	return authRequest('/auth/email/verify', { headers: { 'X-Email-Verification-Key': key } });
}

export function verifyEmail(key: string): Promise<AuthResponse> {
	return authRequest('/auth/email/verify', { method: 'POST', body: JSON.stringify({ key }) });
}

export function requestPasswordReset(email: string): Promise<AuthResponse> {
	return authRequest('/auth/password/request', {
		method: 'POST',
		body: JSON.stringify({ email })
	});
}

export function readPasswordReset(key: string): Promise<AuthResponse> {
	return authRequest('/auth/password/reset', { headers: { 'X-Password-Reset-Key': key } });
}

export function resetPassword(key: string, password: string): Promise<AuthResponse> {
	return authRequest('/auth/password/reset', {
		method: 'POST',
		body: JSON.stringify({ key, password })
	});
}

export interface Health {
	status: string;
}

export function getHealth(): Promise<Health> {
	return request('/health/');
}

export interface Household {
	id: number;
	name: string;
	personal: boolean;
}

export function listHouseholds(): Promise<Household[]> {
	return request('/households/');
}
