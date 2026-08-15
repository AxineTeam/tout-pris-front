import { expect, test } from '@playwright/test';

// E2E contre le vrai backend FastAPI — aucun mock, aucun enregistrement HTTP.

test('la page d’accueil s’affiche', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('Tout Pris');
	await expect(page.getByText('Nouvelle liste')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible();
});

test('créer puis supprimer une stufflist', async ({ page }) => {
	const name = `e2e-${Date.now()}`;

	await page.goto('/');
	await page.getByLabel('Nom').fill(name);
	await page.getByRole('button', { name: 'Créer' }).click();

	const row = page.getByRole('listitem').filter({ hasText: name });
	await expect(row).toBeVisible();

	await row.getByRole('button', { name: `Supprimer ${name}` }).click();
	await expect(row).toHaveCount(0);

	// La suppression est bien persistée côté backend.
	await page.reload();
	await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
});
