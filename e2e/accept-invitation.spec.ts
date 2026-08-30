import { expect, test } from '@playwright/test';
import { address, logOut, signInShared } from './account';
import { createShared, deleteShared, name, sheet } from './households';
import { forget, waitForPath } from './mailpit';

function inviterWithoutName(email: string): string {
	return email.split('@')[0];
}

test('sans session, le lien nomme le foyer et son invitant avant de proposer les deux chemins', async ({
	page
}) => {
	const inviter = await signInShared(page);
	const shared = await createShared(page, name('apercu'));
	const guest = address('preview');

	await page.getByRole('button', { name: 'Envoyer une invitation' }).click();
	await sheet(page).getByLabel('Inviter une adresse').fill(guest);
	await sheet(page).getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');
	await logOut(page);

	await page.goto(link);

	await expect(page.getByTestId('invitation-household')).toContainText(shared.name);
	await expect(page.getByTestId('invitation-household')).toContainText(inviterWithoutName(inviter));
	await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
		'href',
		`/account/login?next=${encodeURIComponent(link)}`
	);
	await expect(page.getByRole('link', { name: 'Créer un compte' })).toBeVisible();

	await signInShared(page);
	await deleteShared(page, shared);
	await forget(guest);
});

test('un lien inutilisable l’annonce au chargement, sans dire pourquoi', async ({ page }) => {
	await page.goto('/invitations/un-jeton-qui-n-existe-pas');

	await expect(page.getByTestId('invitation-dead')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Rejoindre ce foyer' })).toHaveCount(0);
	await expect(page.getByText('Not found.')).toHaveCount(0);
});
