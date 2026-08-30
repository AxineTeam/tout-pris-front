import { expect, test } from '@playwright/test';
import { BASE_URL } from '../playwright.config';
import { address, expectRefusalShown, register, signInShared } from './account';
import {
	addPerson,
	closeMenu,
	closeSheet,
	createShared,
	deleteShared,
	menu,
	name,
	openPerson,
	personRow,
	sheet
} from './households';
import { forget, waitForPath } from './mailpit';

test('un invité rejoint le foyer, s’y désigne, y est promu puis en est retiré', async ({
	browser
}) => {
	test.setTimeout(180_000);
	const hers = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' });
	const his = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' });
	const camille = await hers.newPage();
	const sacha = await his.newPage();
	const guest = address('sacha');

	const hersEmail = await signInShared(camille);
	const shared = await createShared(camille, name('famille'));

	await expect(personRow(camille, 'propriétaire')).toHaveCount(1);
	await addPerson(camille, 'Mamie');

	await camille.getByRole('button', { name: 'Envoyer une invitation' }).click();
	await sheet(camille).getByLabel('Inviter une adresse').fill(guest);
	await sheet(camille).getByRole('button', { name: 'Inviter' }).click();
	await expect(camille.getByTestId('invitations')).toContainText(guest);

	const link = await waitForPath(guest, '/invitations/');

	await register(sacha, guest);
	await sacha.goto(link);
	await expect(sacha.getByTestId('invitation-household')).toContainText(shared.name);
	await expect(sacha.getByTestId('invitation-account')).toContainText(guest);
	await sacha.getByRole('button', { name: 'Rejoindre ce foyer' }).click();
	await expect(sacha).toHaveURL(new RegExp(`/households/${shared.id}$`));

	await expect(sacha.getByTestId('claim')).toBeVisible();
	await expect(sacha.getByTestId('claimable')).toContainText('Mamie');
	await expect(sacha.getByTestId('claim-rest')).toContainText(hersEmail);
	await expect(sacha.getByTestId('claim-rest')).not.toContainText(guest);
	await expect(sacha.getByRole('button', { name: 'Ajouter une personne' })).toHaveCount(0);
	await expect(sacha.getByTestId('statuses')).toHaveCount(0);

	await camille.goto(`/households/${shared.id}`);
	const rows = camille.getByTestId('persons').getByRole('listitem');
	await expect(rows.last()).toContainText(guest);
	await expect(rows.last()).toContainText('n’est encore personne ici');

	await sacha.getByRole('button', { name: 'Aucun d’eux, créer ma personne' }).click();
	await sheet(sacha).getByLabel('Ton nom dans ce foyer').fill('Sacha');
	await sheet(sacha).getByRole('button', { name: 'Créer' }).click();

	await expect(sacha.getByTestId('claim')).toHaveCount(0);
	await expect(personRow(sacha, 'Sacha')).toContainText(guest);
	await expect(sacha.getByRole('button', { name: 'Envoyer une invitation' })).toHaveCount(0);
	await expect(sacha.getByTestId('statuses')).toBeVisible();

	await openPerson(sacha, 'Mamie');
	await expect(menu(sacha).getByRole('menuitem', { name: 'Nommer propriétaire' })).toHaveCount(0);
	await expect(menu(sacha).getByRole('menuitem', { name: 'Renommer' })).toBeVisible();
	await closeMenu(sacha);

	await openPerson(sacha, 'Sacha');
	await expect(menu(sacha).getByRole('menuitem', { name: 'Quitter ce foyer' })).toBeVisible();
	await closeMenu(sacha);

	await camille.reload();
	await openPerson(camille, 'Sacha');
	await menu(camille).getByRole('menuitem', { name: 'Nommer propriétaire' }).click();
	await expect(personRow(camille, 'Sacha')).toContainText('propriétaire');

	await openPerson(camille, 'Sacha');
	await menu(camille).getByRole('menuitem', { name: 'Rétrograder en membre' }).click();
	await expect(personRow(camille, 'Sacha')).not.toContainText('propriétaire');

	await openPerson(camille, hersEmail);
	await expect(menu(camille).getByRole('menuitem', { name: 'Rétrograder en membre' })).toHaveCount(
		0
	);
	await expect(menu(camille).getByRole('menuitem', { name: 'Quitter ce foyer' })).toHaveCount(0);
	await closeMenu(camille);

	await openPerson(camille, 'Sacha');
	await menu(camille).getByRole('menuitem', { name: 'Retirer du foyer' }).click();
	await expect(sheet(camille).getByTestId('removal-order')).toBeVisible();
	await sheet(camille).getByRole('button', { name: 'Retirer du foyer' }).click();
	await expectRefusalShown(camille);
	await closeSheet(camille);

	await openPerson(camille, 'Sacha');
	await menu(camille).getByRole('menuitem', { name: 'Retirer son compte du foyer' }).click();
	await sheet(camille).getByRole('button', { name: 'Retirer son compte du foyer' }).click();
	await expect(personRow(camille, 'Sacha')).toContainText('sans compte');

	await openPerson(camille, 'Sacha');
	await menu(camille).getByRole('menuitem', { name: 'Retirer du foyer' }).click();
	await expect(sheet(camille).getByTestId('removal-order')).toHaveCount(0);
	await sheet(camille).getByRole('button', { name: 'Retirer du foyer' }).click();
	await expect(camille.getByTestId('persons')).not.toContainText('Sacha');

	await deleteShared(camille, shared);
	await forget(guest);
	await hers.close();
	await his.close();
});
