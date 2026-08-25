import { expect, test } from '@playwright/test';
import { address, register, signInShared } from './account';
import { createShared, deleteShared, name } from './households';
import { forget, waitForPath } from './mailpit';

test('un invité rejoint le foyer sans y être personne, puis devient celle qu’il a choisie', async ({
	page
}) => {
	await signInShared(page);
	const shared = await createShared(page, name('rejoindre'));
	const guest = address('joining');

	await page.getByLabel('Ajouter une personne').fill('Léo');
	await page.getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId('persons')).toContainText('Léo');

	await page.getByLabel('Inviter une adresse').fill(guest);
	await page.getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');

	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await register(page, guest);

	await page.goto(link);
	await expect(page.getByTestId('invitation-account')).toContainText(guest);
	await page.getByRole('button', { name: 'Rejoindre ce foyer' }).click();

	await expect(page).toHaveURL(new RegExp(`/households/${shared.id}$`));
	await expect(page.getByTestId('household-name')).toHaveText(shared.name);
	await expect(page.getByRole('link', { name: 'Personnel' })).toBeVisible();
	await expect(page.getByTestId('claim-invite')).toBeVisible();
	await expect(page.getByTestId('strangers')).toContainText(guest);
	await expect(page.getByTestId('persons')).not.toContainText(guest);

	await page.getByRole('button', { name: 'Je suis Léo' }).click();

	const persons = page.getByTestId('persons').getByRole('listitem');
	await expect(persons.filter({ hasText: guest })).toHaveCount(1);
	await expect(persons.filter({ hasText: guest })).toContainText('Léo');
	await expect(persons.filter({ hasText: 'Léo' })).toHaveCount(1);
	await expect(page.getByTestId('claim-invite')).toHaveCount(0);

	await page.getByRole('button', { name: 'Quitter ce foyer' }).click();
	await expect(page.getByRole('link', { name: shared.name })).toHaveCount(0);

	await page.goto('/');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();
	await signInShared(page);
	await deleteShared(page, shared);
	await forget(guest);
});

test('un lien déjà servi ne dit pas pourquoi il ne marche plus', async ({ page }) => {
	await signInShared(page);

	await page.goto('/invitations/un-jeton-qui-n-existe-pas');
	await expect(page.getByTestId('invitation-account')).toBeVisible();
	await page.getByRole('button', { name: 'Rejoindre ce foyer' }).click();

	await expect(page.getByTestId('invitation-dead')).toBeVisible();
	await expect(page.getByText('Not found.')).toHaveCount(0);
});

test('sans session, le lien propose les deux chemins sans deviner', async ({ page }) => {
	await page.goto('/invitations/un-jeton-quelconque');

	await expect(page.getByTestId('invitation-anonymous')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
		'href',
		'/account/login?next=%2Finvitations%2Fun-jeton-quelconque'
	);
	await expect(page.getByRole('link', { name: 'Créer un compte' })).toBeVisible();
});
