import { expect, test } from '@playwright/test';
import { address, logOut, register, signInShared } from './account';
import { createShared, deleteShared, name } from './households';
import { forget, waitForPath } from './mailpit';

// L'API nomme l'invitant par son nom complet, à défaut par la partie locale de
// son adresse (`display_name_of`) : le compte partagé n'a pas de nom, c'est
// donc celle-là qui s'affiche.
function displayed(email: string): string {
	return email.split('@')[0];
}

test('un invité rejoint le foyer sans y être personne, puis devient celle qu’il a choisie', async ({
	page
}) => {
	const inviter = await signInShared(page);
	const shared = await createShared(page, name('rejoindre'));
	const guest = address('joining');

	await page.getByLabel('Ajouter une personne').fill('Léo');
	await page.getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId('persons')).toContainText('Léo');

	await page.getByLabel('Inviter une adresse').fill(guest);
	await page.getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');

	await logOut(page);
	await register(page, guest);

	await page.goto(link);
	await expect(page.getByTestId('invitation-household')).toContainText(shared.name);
	await expect(page.getByTestId('invitation-household')).toContainText(displayed(inviter));
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

	await page.getByLabel('Inviter une adresse').fill(guest);
	await page.getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');
	await logOut(page);

	await page.goto(link);

	await expect(page.getByTestId('invitation-household')).toContainText(shared.name);
	await expect(page.getByTestId('invitation-household')).toContainText(displayed(inviter));
	await expect(page.getByTestId('invitation-anonymous')).toBeVisible();
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
