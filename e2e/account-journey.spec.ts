import { expect, test } from '@playwright/test';
import { PASSWORD, address, expectRefusalShown, logIn, sharedAccount, signUp } from './account';
import { forget, waitForPath } from './mailpit';

test('inscription, vérification de l’adresse, puis déconnexion', async ({ page }) => {
	const email = address('journey');

	await signUp(page, email);
	await page.goto(await waitForPath(email, '/account/verify-email/'));

	await expect(page.getByRole('button', { name: 'Confirmer mon adresse' })).toBeEnabled();
	await page.getByRole('button', { name: 'Confirmer mon adresse' }).click();
	await expect(page.getByTestId('verified-signed-in')).toBeVisible();

	await page.goto('/');
	await expect(page.getByTestId('account-email')).toHaveText(email);

	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await expect(page).toHaveURL('/account/login');

	await page.goto('/');
	await expect(page).toHaveURL('/account/login?next=%2F');

	await forget(email);
});

test('un lien de vérification invalide propose de recommencer', async ({ page }) => {
	await page.goto('/account/verify-email/pas-une-cle');

	await expect(page.getByText('Lien inutilisable')).toBeVisible();
	await expect(page.getByRole('link', { name: 'inscription' })).toBeVisible();
});

test('réinitialisation du mot de passe de bout en bout', async ({ page }) => {
	const email = address('reset');
	const renewed = 'un-tout-autre-mot-de-passe';

	await signUp(page, email);
	await page.goto(await waitForPath(email, '/account/verify-email/'));
	await page.getByRole('button', { name: 'Confirmer mon adresse' }).click();
	await expect(page.getByTestId('verified-signed-in')).toBeVisible();
	await page.goto('/');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();

	await page.goto('/account/password/reset');
	await page.getByLabel('Adresse email').fill(email);
	await page.getByRole('button', { name: 'Envoyer le lien' }).click();
	await expect(page.getByTestId('reset-requested')).toBeVisible();

	await page.goto(await waitForPath(email, '/account/password/reset/key/'));
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(renewed);
	await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
	await expect(page.getByTestId('reset-done')).toBeVisible();

	await page.goto('/account/login');
	await logIn(page, email, PASSWORD);
	await expectRefusalShown(page);

	await page.goto('/account/login');
	await logIn(page, email, renewed);
	await expect(page).toHaveURL(/\/households\/\d+$/);
	await expect(page.getByTestId('account-email')).toHaveText(email);

	await forget(email);
});

// `//evil.com` et `/\evil.com` résolvent tous deux vers http://evil.com/ :
// le parseur d'URL normalise l'antislash en slash pour les schémas spéciaux.
const EXTERNAL_DESTINATIONS = ['https://evil.example/', '//evil.com', '/\\evil.com'];

test('une demande de réinitialisation refusée ne prétend pas avoir envoyé', async ({ page }) => {
	const email = address('throttle');

	// allauth limite cette route à 5 demandes par minute et par adresse.
	for (let attempt = 0; attempt < 5; attempt++) {
		await page.goto('/account/password/reset');
		await page.getByLabel('Adresse email').fill(email);
		await page.getByRole('button', { name: 'Envoyer le lien' }).click();
		await expect(page.getByTestId('reset-requested')).toBeVisible();
	}

	await page.goto('/account/password/reset');
	await page.getByLabel('Adresse email').fill(email);
	await page.getByRole('button', { name: 'Envoyer le lien' }).click();

	await expect(page.getByRole('alert')).toContainText('Trop de tentatives');
	await expect(page.getByTestId('reset-requested')).toBeHidden();

	await forget(email);
});

test('une destination externe passée dans next est ignorée', async ({ page }) => {
	const email = await sharedAccount();

	for (const destination of EXTERNAL_DESTINATIONS) {
		await page.goto(`/account/login?next=${encodeURIComponent(destination)}`);
		await logIn(page, email, PASSWORD);

		await expect(page).toHaveURL(/\/households\/\d+$/);
		await expect(page.getByTestId('account-email')).toHaveText(email);

		await page.getByRole('button', { name: 'Se déconnecter' }).click();
		await expect(page).toHaveURL('/account/login');
	}
});
