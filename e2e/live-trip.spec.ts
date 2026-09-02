import { expect, test, type Page } from '@playwright/test';
import { BASE_URL } from '../playwright.config';
import { openAsShared } from './account';
import { createShared, deleteShared, inDays, name, openTrips, sheet, trip } from './households';

function pill(page: Page, item: string) {
	return page.getByRole('button', { name: new RegExp(`^${item} pour Tout le monde`) });
}

async function addItem(page: Page, wanted: string) {
	await page.getByRole('combobox').click();
	await page.keyboard.type(wanted);
	await page.getByTestId('item-create').click();
	await expect(pill(page, wanted)).toBeVisible();
}

async function advanced(page: Page, item: string): Promise<string> {
	const before = await pill(page, item).textContent();
	await pill(page, item).click();
	await expect(pill(page, item)).not.toHaveText(before ?? '');
	return (await pill(page, item).textContent()) ?? '';
}

// La tablette posée sur la table : deux navigateurs sur le même compte, que le
// sondage ne distingue pas de deux comptes du même foyer, et qui épargne au
// test les trois minutes du parcours d'invitation.
test('une coche faite sur un téléphone arrive sur l’autre sans rien toucher', async ({
	browser
}) => {
	test.setTimeout(180_000);
	const hers = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' });
	const his = await browser.newContext({ baseURL: BASE_URL, locale: 'fr-FR' });
	const camille = await hers.newPage();
	const sacha = await his.newPage();

	await openAsShared(camille);
	const shared = await createShared(camille, name('table'));

	const corse = name('corse');
	await openTrips(camille);
	await camille.getByRole('button', { name: 'Nouveau voyage' }).click();
	await expect(camille.getByTestId('screen-title')).toHaveText('Nouveau voyage');
	await camille.getByLabel('Nom du voyage').fill(corse);
	await camille.getByLabel('Date de départ').fill(inDays(0));
	await camille.getByRole('button', { name: 'Créer' }).click();
	await expect(camille.getByTestId('screen-title')).toHaveText(corse);

	const couches = name('couches');
	const lingettes = name('lingettes');
	await addItem(camille, couches);
	await addItem(camille, lingettes);

	await openAsShared(sacha);
	await sacha.goto(new URL(camille.url()).pathname);
	await expect(sacha.getByTestId('screen-title')).toHaveText(corse);

	// Trois secondes de sondage, une marge pour la requête elle-même.
	const arrives = { timeout: 10_000, message: 'la coche de l’autre téléphone' };

	const cochees = await advanced(camille, couches);
	await expect.poll(() => pill(sacha, couches).textContent(), arrives).toBe(cochees);

	const essuyees = await advanced(sacha, lingettes);
	await expect.poll(() => pill(camille, lingettes).textContent(), arrives).toBe(essuyees);

	await camille.getByRole('link', { name: 'Retour' }).click();
	await trip(camille, corse).getByRole('button').click();
	await camille.getByRole('menu').getByRole('menuitem', { name: 'Supprimer' }).click();
	await sheet(camille).getByRole('button', { name: 'Supprimer' }).click();
	await expect(camille.getByTestId('trips-empty')).toBeVisible();

	await deleteShared(camille, shared);
	await hers.close();
	await his.close();
});
