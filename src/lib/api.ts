// Client HTTP de l'API Tout Pris (Django + DRF + django-allauth).
// Le front et l'API sont servis depuis la même origine : en production le
// reverse proxy nginx route /api vers Django, en dev/preview c'est le proxy
// Vite (voir vite.config.ts). Pas de CORS, pas d'URL absolue.
export const API_BASE = '/api';
const AUTH_BASE = `${API_BASE}/auth/browser/v1`;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: unknown,
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

async function refusalBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const method = methodOf(init);
	const response = await send(`${API_BASE}${path}`, init);
	if (response.status === 401) sessionExpired?.();
	if (!response.ok) {
		throw new ApiError(
			response.status,
			await refusalBody(response),
			`${method} ${path} → ${response.status}`
		);
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

export interface SessionData {
	user?: AuthUser;
	flows?: AuthFlow[];
}

export interface AuthResponse<T = SessionData> {
	status: number;
	data?: T;
	meta?: { is_authenticated?: boolean };
	errors?: AuthError[];
}

function isAuthResponse(body: unknown): body is AuthResponse<unknown> {
	return (
		typeof body === 'object' && body !== null && typeof (body as AuthResponse).status === 'number'
	);
}

export async function authRequest<T = SessionData>(
	path: string,
	init: RequestInit = {}
): Promise<AuthResponse<T>> {
	const method = methodOf(init);
	const response = await send(`${AUTH_BASE}${path}`, init);
	const body = await response.json().catch(() => null);
	if (!isAuthResponse(body)) {
		throw new ApiError(response.status, body, `${method} ${path} → ${response.status}`);
	}
	return body as AuthResponse<T>;
}

export function authErrors(response: AuthResponse<unknown>): AuthError[] {
	if (response.errors) return response.errors;
	if (response.status === 200 || response.meta) return [];
	return [refusedWithoutSaying(response.status)];
}

function refusedWithoutSaying(status: number): AuthError {
	return status === 429
		? { message: 'Trop de tentatives, réessaie dans une minute.', code: 'rate_limited' }
		: { message: 'L’API a refusé la demande.', code: 'refused' };
}

function relayed(body: unknown): AuthError[] {
	if (typeof body === 'string') return [{ message: body, code: 'refused' }];
	if (Array.isArray(body)) return body.flatMap(relayed);
	if (body === null || typeof body !== 'object') return [];
	const envelope = body as { detail?: unknown; errors?: AuthError[] };
	if (Array.isArray(envelope.errors)) return envelope.errors;
	if (envelope.detail !== undefined) return relayed(envelope.detail);
	return Object.entries(body).flatMap(([param, invalid]) =>
		relayed(invalid).map((error) => ({ ...error, param }))
	);
}

export function apiErrors(refusal: ApiError): AuthError[] {
	const said = relayed(refusal.body);
	return said.length > 0 ? said : [refusedWithoutSaying(refusal.status)];
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
	version?: string;
	commit?: string | null;
}

export function getHealth(): Promise<Health> {
	return request('/health/');
}

export interface EmailAddress {
	email: string;
	verified: boolean;
	primary: boolean;
}

type Emails = Promise<AuthResponse<EmailAddress[]>>;

export function listEmails(): Emails {
	return authRequest('/account/email');
}

export function addEmail(email: string): Emails {
	return authRequest('/account/email', { method: 'POST', body: JSON.stringify({ email }) });
}

export function makeEmailPrimary(email: string): Emails {
	return authRequest('/account/email', {
		method: 'PATCH',
		body: JSON.stringify({ email, primary: true })
	});
}

export function removeEmail(email: string): Emails {
	return authRequest('/account/email', { method: 'DELETE', body: JSON.stringify({ email }) });
}

export function resendEmailVerification(email: string): Emails {
	return authRequest('/account/email', { method: 'PUT', body: JSON.stringify({ email }) });
}

export function changePassword(current: string, renewed: string): Promise<AuthResponse> {
	return authRequest('/account/password/change', {
		method: 'POST',
		body: JSON.stringify({ current_password: current, new_password: renewed })
	});
}

export interface Household {
	id: number;
	name: string;
	personal: boolean;
}

export function listHouseholds(): Promise<Household[]> {
	return request('/households/');
}

export function createHousehold(name: string): Promise<Household> {
	return request('/households/', { method: 'POST', body: JSON.stringify({ name }) });
}

export function renameHousehold(id: number, name: string): Promise<Household> {
	return request(`/households/${id}/`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function deleteHousehold(id: number): Promise<void> {
	return request(`/households/${id}/`, { method: 'DELETE' });
}

export interface Person {
	id: number;
	name: string;
	user: number | null;
}

export function listPersons(household: number): Promise<Person[]> {
	return request(`/households/${household}/persons/`);
}

export function createPerson(household: number, name: string): Promise<Person> {
	return request(`/households/${household}/persons/`, {
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

export function renamePerson(household: number, id: number, name: string): Promise<Person> {
	return request(`/households/${household}/persons/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify({ name })
	});
}

export function deletePerson(household: number, id: number): Promise<void> {
	return request(`/households/${household}/persons/${id}/`, { method: 'DELETE' });
}

export function claimPerson(household: number, id: number): Promise<void> {
	return request(`/households/${household}/persons/${id}/claim/`, { method: 'POST' });
}

export type HouseholdRole = 'owner' | 'member';

export interface Member {
	id: number;
	user: number;
	email: string;
	role: HouseholdRole;
}

export function listMembers(household: number): Promise<Member[]> {
	return request(`/households/${household}/members/`);
}

export function setMemberRole(household: number, id: number, role: HouseholdRole): Promise<Member> {
	return request(`/households/${household}/members/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify({ role })
	});
}

export function removeMember(household: number, id: number): Promise<void> {
	return request(`/households/${household}/members/${id}/`, { method: 'DELETE' });
}

export interface Invitation {
	id: number;
	email: string;
	created_at: string;
	expires_at: string;
}

export function listInvitations(household: number): Promise<Invitation[]> {
	return request(`/households/${household}/invitations/`);
}

export function sendInvitation(household: number, email: string): Promise<void> {
	return request(`/households/${household}/invitations/`, {
		method: 'POST',
		body: JSON.stringify({ email })
	});
}

export function cancelInvitation(household: number, id: number): Promise<void> {
	return request(`/households/${household}/invitations/${id}/`, { method: 'DELETE' });
}

export function acceptInvitation(token: string): Promise<Household> {
	return request('/invitations/accept/', { method: 'POST', body: JSON.stringify({ token }) });
}
