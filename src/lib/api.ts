// Client HTTP de l'API Tout Pris (Django + DRF + django-allauth).
// Le front et l'API sont servis depuis la même origine : en production le
// reverse proxy nginx route /api vers Django, en dev/preview c'est le proxy
// Vite (voir vite.config.ts). Pas de CORS, pas d'URL absolue.
import * as m from '$lib/paraglide/messages.js';

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

async function call(path: string, init: RequestInit): Promise<Response> {
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
	return response;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const response = await call(path, init);
	if (response.status === 204) return undefined as T;
	return response.json();
}

export interface AuthUser {
	id: number;
	display: string;
	email: string;
	has_usable_password: boolean;
	language?: string;
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
		? { message: m.api_rate_limited(), code: 'rate_limited' }
		: { message: m.api_refused(), code: 'refused' };
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

export function fieldErrors(errors: AuthError[], field: string): AuthError[] {
	return errors.filter((error) => error.param === field);
}

export function formErrors(errors: AuthError[], ...fields: string[]): AuthError[] {
	return errors.filter((error) => error.param === undefined || !fields.includes(error.param));
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

// Les codes de langue de l'API ne sont pas ceux de paraglide : elle connaît
// « en-us » et « fr » (settings.LANGUAGES), le projet inlang « en » et « fr ».
// C'est le code de l'API qui part ici, tout autre valeur est refusée en 400.
export type ApiLocale = 'fr' | 'en-us';

export interface Me {
	id: number;
	email: string;
	language: ApiLocale;
}

export function updateMe(language: ApiLocale): Promise<Me> {
	return request('/me/', { method: 'PATCH', body: JSON.stringify({ language }) });
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

export interface InvitationPreview {
	household: string;
	inviter: string | null;
	expires_at: string;
}

export function readInvitation(token: string): Promise<InvitationPreview> {
	return request(`/invitations/${encodeURIComponent(token)}/`);
}

export function acceptInvitation(token: string): Promise<Household> {
	return request('/invitations/accept/', { method: 'POST', body: JSON.stringify({ token }) });
}

export type ProgressCategory = 'not_started' | 'in_progress' | 'done';

export interface ItemStatus {
	id: number;
	name: string;
	color: string;
	progress: ProgressCategory;
	position: number;
	is_default: boolean;
}

export function listItemStatuses(household: number): Promise<ItemStatus[]> {
	return request(`/households/${household}/item-statuses/`);
}

export function createItemStatus(
	household: number,
	name: string,
	color: string,
	progress: ProgressCategory
): Promise<ItemStatus> {
	return request(`/households/${household}/item-statuses/`, {
		method: 'POST',
		body: JSON.stringify({ name, color, progress })
	});
}

export function updateItemStatus(
	household: number,
	id: number,
	changes: {
		name?: string;
		color?: string;
		progress?: ProgressCategory;
		position?: number;
		is_default?: true;
	}
): Promise<ItemStatus> {
	return request(`/households/${household}/item-statuses/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export function deleteItemStatus(household: number, id: number): Promise<void> {
	return request(`/households/${household}/item-statuses/${id}/`, { method: 'DELETE' });
}

export interface ItemType {
	id: number;
	name: string;
	description: string;
}

export interface ItemTypeOutcome {
	item: ItemType;
	created: boolean;
}

export function listItemTypes(household: number): Promise<ItemType[]> {
	return request(`/households/${household}/item-types/`);
}

export async function createItemType(household: number, name: string): Promise<ItemTypeOutcome> {
	const response = await call(`/households/${household}/item-types/`, {
		method: 'POST',
		body: JSON.stringify({ name })
	});
	return { item: await response.json(), created: response.status === 201 };
}

export function updateItemType(
	household: number,
	id: number,
	changes: { name?: string; description?: string }
): Promise<ItemType> {
	return request(`/households/${household}/item-types/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export interface Kit {
	id: number;
	name: string;
	description: string;
	position: number;
}

export interface KitItem {
	id: number;
	item_type: ItemType;
	person: Person | null;
	quantity: number;
	position: number;
}

export interface KitDetail extends Kit {
	items: KitItem[];
}

export function listKits(household: number): Promise<Kit[]> {
	return request(`/households/${household}/kits/`);
}

export function readKit(household: number, id: number): Promise<KitDetail> {
	return request(`/households/${household}/kits/${id}/`);
}

export function createKit(household: number, name: string, description: string): Promise<Kit> {
	return request(`/households/${household}/kits/`, {
		method: 'POST',
		body: JSON.stringify({ name, description })
	});
}

export function updateKit(
	household: number,
	id: number,
	changes: { name?: string; description?: string; position?: number }
): Promise<KitDetail> {
	return request(`/households/${household}/kits/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export function deleteKit(household: number, id: number): Promise<void> {
	return request(`/households/${household}/kits/${id}/`, { method: 'DELETE' });
}

export function createKitItem(
	household: number,
	kit: number,
	line: { item_type: number; person?: number | null; quantity?: number }
): Promise<KitItem> {
	return request(`/households/${household}/kits/${kit}/items/`, {
		method: 'POST',
		body: JSON.stringify(line)
	});
}

export function updateKitItem(
	household: number,
	kit: number,
	id: number,
	changes: { person?: number | null; quantity?: number; position?: number }
): Promise<KitItem> {
	return request(`/households/${household}/kits/${kit}/items/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export function deleteKitItem(household: number, kit: number, id: number): Promise<void> {
	return request(`/households/${household}/kits/${kit}/items/${id}/`, { method: 'DELETE' });
}

export interface Trip {
	id: number;
	name: string;
	date: string;
	archived_at: string | null;
}

export function listTrips(household: number, archived = false): Promise<Trip[]> {
	return request(`/households/${household}/trips/?archived=${archived}`);
}

export interface TripParticipant {
	id: number;
	person: Person;
}

export interface TripItem {
	id: number;
	item_type: ItemType;
	person: Person | null;
	quantity: number;
	status: ItemStatus;
	position: number;
	kits: Kit[];
}

export interface TripDetail extends Trip {
	participants: TripParticipant[];
	items: TripItem[];
}

export function readTrip(household: number, id: number): Promise<TripDetail> {
	return request(`/households/${household}/trips/${id}/`);
}

export function createTrip(
	household: number,
	trip: { name: string; date: string; participants?: number[]; kits?: number[] }
): Promise<TripDetail> {
	return request(`/households/${household}/trips/`, {
		method: 'POST',
		body: JSON.stringify(trip)
	});
}

export function listTripItems(household: number, trip: number): Promise<TripItem[]> {
	return request(`/households/${household}/trips/${trip}/items/`);
}

export function createTripItem(
	household: number,
	trip: number,
	line: { item_type: number; person?: number | null; quantity?: number }
): Promise<TripItem> {
	return request(`/households/${household}/trips/${trip}/items/`, {
		method: 'POST',
		body: JSON.stringify(line)
	});
}

export function updateTripItem(
	household: number,
	trip: number,
	id: number,
	changes: { person?: number | null; quantity?: number; status?: number }
): Promise<TripItem> {
	return request(`/households/${household}/trips/${trip}/items/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export function deleteTripItem(household: number, trip: number, id: number): Promise<void> {
	return request(`/households/${household}/trips/${trip}/items/${id}/`, { method: 'DELETE' });
}

export function addParticipant(
	household: number,
	trip: number,
	person: number
): Promise<TripParticipant> {
	return request(`/households/${household}/trips/${trip}/participants/`, {
		method: 'POST',
		body: JSON.stringify({ person })
	});
}

export function removeParticipant(household: number, trip: number, id: number): Promise<void> {
	return request(`/households/${household}/trips/${trip}/participants/${id}/`, {
		method: 'DELETE'
	});
}

export function embarkKit(household: number, trip: number, kit: number): Promise<TripItem[]> {
	return request(`/households/${household}/trips/${trip}/kits/`, {
		method: 'POST',
		body: JSON.stringify({ kit })
	});
}

export function updateTrip(
	household: number,
	id: number,
	changes: { name?: string; date?: string; archived?: boolean }
): Promise<Trip> {
	return request(`/households/${household}/trips/${id}/`, {
		method: 'PATCH',
		body: JSON.stringify(changes)
	});
}

export function duplicateTrip(
	household: number,
	id: number,
	name: string,
	date: string
): Promise<Trip> {
	return request(`/households/${household}/trips/${id}/duplicate/`, {
		method: 'POST',
		body: JSON.stringify({ name, date })
	});
}

export function deleteTrip(household: number, id: number): Promise<void> {
	return request(`/households/${household}/trips/${id}/`, { method: 'DELETE' });
}
