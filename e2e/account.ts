import { expect, type Page } from '@playwright/test';
import { waitForPath } from './mailpit';

export const PASSWORD = 'correct-horse-battery-staple';

export function address(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function signUp(page: Page, email: string) {
	await page.goto('/account/signup');
	await page.getByLabel('Adresse email').fill(email);
	await page.getByLabel('Mot de passe').fill(PASSWORD);
	await page.getByRole('button', { name: 'Créer mon compte' }).click();
	await expect(page.getByTestId('verification-pending')).toBeVisible();
}

export async function logIn(page: Page, email: string, password: string) {
	await page.getByLabel('Adresse email').fill(email);
	await page.getByLabel('Mot de passe').fill(password);
	await page.getByRole('button', { name: 'Se connecter' }).click();
}

export async function register(page: Page, email: string) {
	await signUp(page, email);
	await page.goto(await waitForPath(email, '/account/verify-email/'));
	await page.getByRole('button', { name: 'Confirmer mon adresse' }).click();
	await expect(page.getByTestId('verified-signed-in')).toBeVisible();
}
