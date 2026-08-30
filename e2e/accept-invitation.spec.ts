import { expect, test } from '@playwright/test';
import { address, logOut, register, signInShared } from './account';
import { addPerson, createShared, deleteShared, name, personRow, sheet } from './households';
import { forget, waitForPath } from './mailpit';

function inviterWithoutName(email: string): string {
	return email.split('@')[0];
}

test('un invité rejoint le foyer, s’y désigne comme une personne déjà là, puis le quitte', async ({
	page
}) => {
	const inviter = await signInShared(page);
	const shared = await createShared(page, name('rejoindre'));
	const guest = address('joining');

	await addPerson(page, 'Léo');

	await page.getByRole('button', { name: 'Envoyer une invitation' }).click();
	await sheet(page).getByLabel('Inviter une adresse').fill(guest);
	await sheet(page).getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');

	await logOut(page);
	await register(page, guest);

	await page.goto(link);
	await expect(page.getByTestId('invitation-household')).toContainText(shared.name);
	await expect(page.getByTestId('invitation-household')).toContainText(inviterWithoutName(inviter));
	await expect(page.getByTestId('invitation-account')).toContainText(guest);
	await page.getByRole('button', { name: 'Rejoindre ce foyer' }).click();

	await expect(page).toHaveURL(new RegExp(`/households/${shared.id}$`));
	await expect(page.getByTestId('household-switcher')).toHaveText(shared.name);
	await expect(page.getByTestId('claim')).toBeVisible();
	await expect(page.getByTestId('claim-rest')).not.toContainText(guest);

	await page.getByRole('button', { name: 'Je suis Léo' }).click();

	await expect(page.getByTestId('claim')).toHaveCount(0);
	await expect(personRow(page, 'Léo')).toContainText(guest);

	await personRow(page, 'Léo').getByRole('button', { name: 'Actions sur Léo' }).click();
	await page.getByRole('menuitem', { name: 'Quitter ce foyer' }).click();
	await sheet(page).getByRole('button', { name: 'Quitter ce foyer' }).click();
	await expect(page.getByTestId('household-switcher')).not.toHaveText(shared.name);

	await logOut(page);
	await signInShared(page);
	await deleteShared(page, shared);
	await forget(guest);
});

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
