import { expect, test } from '@playwright/test';
import { PASSWORD, address, logIn, logOut, register, signInShared } from './account';
import { forget } from './mailpit';

test('changer son mot de passe, puis se connecter avec le nouveau', async ({ page }) => {
	const email = address('me-password');
	const renewed = 'un-tout-autre-mot-de-passe';

	await register(page, email);
	await page.goto('/me');
	await expect(page.getByTestId('account-display')).toHaveText(email.split('@')[0]);

	await page.getByLabel('Mot de passe actuel', { exact: true }).fill('pas-le-bon');
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(renewed);
	await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
	await expect(page.getByRole('alert')).toContainText('current password');

	await page.getByLabel('Mot de passe actuel', { exact: true }).fill(PASSWORD);
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(renewed);
	await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
	await expect(page.getByTestId('password-changed')).toBeVisible();

	await logOut(page);
	await logIn(page, email, renewed);
	await expect(page).toHaveURL(/\/households\/\d+$/);

	await forget(email);
});

test('chaque œil de l’écran nomme le champ qu’il dévoile', async ({ page }) => {
	await signInShared(page);
	await page.goto('/me');

	const current = page.getByLabel('Mot de passe actuel', { exact: true });
	await page.getByRole('button', { name: 'Afficher le mot de passe actuel' }).click();

	await expect(current).toHaveAttribute('type', 'text');
	await expect(page.getByLabel('Nouveau mot de passe', { exact: true })).toHaveAttribute(
		'type',
		'password'
	);
});

test('ajouter puis supprimer une adresse secondaire', async ({ page }) => {
	const second = address('me-email-second');

	await signInShared(page);
	await page.goto('/me');

	const addresses = page.getByTestId('email-addresses');
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await page.getByLabel('Ajouter une adresse').fill(second);
	await page.getByRole('button', { name: 'Ajouter' }).click();

	const added = addresses.getByRole('listitem').filter({ hasText: second });
	await expect(added).toContainText('non vérifiée');

	await added.getByRole('button', { name: 'Supprimer' }).click();
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await page.reload();
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await forget(second);
});
