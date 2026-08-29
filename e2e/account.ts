import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { BASE_URL } from '../playwright.config';
import { waitForPath } from './mailpit';

export const PASSWORD = 'correct-horse-battery-staple';

const AUTH = '/api/auth/browser/v1';

export function address(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function post(context: APIRequestContext, path: string, data: object) {
	await context.get(`${AUTH}/config`);
	const { cookies } = await context.storageState();
	const csrf = cookies.find((cookie) => cookie.name === 'csrftoken')?.value ?? '';
	// Origin : Django le compare à l'hôte de la requête avant toute vue, le même
	// mécanisme qui a fait retirer changeOrigin du proxy Vite.
	return context.post(`${AUTH}${path}`, {
		headers: { 'X-CSRFToken': csrf, Origin: BASE_URL },
		data
	});
}

// Créer un compte coûte une inscription, et allauth en limite le débit par IP :
// une par test ferait tomber la suite en 429 dès qu'elle grossit. Les tests qui
// ne portent pas sur l'inscription se partagent donc un compte par worker.
async function verifiedAccount(): Promise<string> {
	const email = address('shared');
	// L'API retient la langue dans laquelle l'inscription a été servie, et le
	// front sert ensuite le compte dans cette langue-là. Un contexte qui ne
	// demande rien se voit répondre en anglais, alors que toute la suite lit
	// des écrans français : il annonce donc la même langue que les navigateurs.
	const context = await request.newContext({
		baseURL: BASE_URL,
		extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' }
	});
	await post(context, '/auth/signup', { email, password: PASSWORD });
	const link = await waitForPath(email, '/account/verify-email/');
	const key = decodeURIComponent(link.replace('/account/verify-email/', ''));
	await post(context, '/auth/email/verify', { key });
	await context.dispose();
	return email;
}

let shared: Promise<string> | null = null;

export function sharedAccount(): Promise<string> {
	shared ??= verifiedAccount().catch((error) => {
		shared = null;
		throw error;
	});
	return shared;
}

export async function logIn(page: Page, email: string, password: string) {
	await page.getByLabel('Adresse email').fill(email);
	await page.getByLabel('Mot de passe', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Se connecter' }).click();
}

// Le libellé du refus appartient à allauth et change avec ses versions : ce qui
// se vérifie ici est que l'API a refusé et que le front relaie ce qu'elle a dit.
export async function expectRefusalShown(page: Page) {
	await expect(page.getByRole('alert').getByRole('listitem')).toHaveText(/\S/);
}

export async function expectSignedInAs(page: Page, email: string) {
	await page.goto('/me');
	await expect(page.getByTestId('account-email')).toHaveText(email);
}

export async function logOut(page: Page) {
	await page.goto('/me');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await expect(page).toHaveURL('/account/login');
}

export async function signInShared(page: Page): Promise<string> {
	const email = await sharedAccount();
	await page.goto('/account/login');
	await logIn(page, email, PASSWORD);
	await expect(page).toHaveURL(/\/households\/\d+\/trips$/);
	return email;
}

export async function signUp(page: Page, email: string) {
	await page.goto('/account/signup');
	await page.getByLabel('Adresse email').fill(email);
	await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
	await page.getByRole('button', { name: 'Créer mon compte' }).click();
	await expect(page.getByTestId('verification-pending')).toBeVisible();
}

export async function register(page: Page, email: string) {
	await signUp(page, email);
	await page.goto(await waitForPath(email, '/account/verify-email/'));
	await page.getByRole('button', { name: 'Confirmer mon adresse' }).click();
	await expect(page.getByTestId('verified-signed-in')).toBeVisible();
}
