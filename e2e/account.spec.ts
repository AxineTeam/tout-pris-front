import { expect, test } from '@playwright/test';

test('une route protégée renvoie vers la connexion', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveURL('/account/login?next=%2F');
	await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
});

test('des identifiants faux affichent l’erreur du backend', async ({ page }) => {
	await page.goto('/account/login');
	await page.getByLabel('Adresse email').fill('inconnu@example.com');
	await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
	await page.getByRole('button', { name: 'Se connecter' }).click();

	await expect(page.getByRole('alert')).toContainText('not correct');
	await expect(page).toHaveURL('/account/login');
});

test('l’inscription attend la vérification de l’adresse', async ({ page }) => {
	await page.goto('/account/signup');
	await page.getByLabel('Adresse email').fill(`e2e-${Date.now()}@example.com`);
	await page.getByLabel('Mot de passe').fill('correct-horse-battery-staple');
	await page.getByRole('button', { name: 'Créer mon compte' }).click();

	await expect(page.getByTestId('verification-pending')).toBeVisible();
});
