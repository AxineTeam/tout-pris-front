import { expect, test } from '@playwright/test';

test('la page d’accueil lit l’état du backend', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('Tout Pris');
	await expect(page.getByTestId('backend-status')).toHaveText('ok');
});
