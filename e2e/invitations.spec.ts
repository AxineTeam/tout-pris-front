import { expect, test } from '@playwright/test';
import { address, signInShared } from './account';
import { createShared, deleteShared, name, openPersonal } from './households';
import { forget } from './mailpit';

test('inviter une adresse, la voir en attente, puis annuler', async ({ page }) => {
	await signInShared(page);
	const shared = await createShared(page, name('invitations'));
	const guest = address('guest');

	await expect(page.getByTestId('no-invitation')).toBeVisible();

	await page.getByLabel('Inviter une adresse').fill(guest);
	await page.getByRole('button', { name: 'Inviter' }).click();

	await expect(page.getByTestId('invitation-sent')).toBeVisible();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	await page.getByRole('button', { name: `Annuler l’invitation de ${guest}` }).click();
	await expect(page.getByTestId('no-invitation')).toBeVisible();

	await deleteShared(page, shared);
	await forget(guest);
});

test('le foyer personnel n’a pas d’invitations', async ({ page }) => {
	await signInShared(page);
	await openPersonal(page);

	await expect(page.getByTestId('household-name')).toHaveText('Personnel');
	await expect(page.getByLabel('Inviter une adresse')).toHaveCount(0);
	await expect(page.getByTestId('invitations')).toHaveCount(0);
});
