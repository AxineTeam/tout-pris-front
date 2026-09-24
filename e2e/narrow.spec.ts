import { expect, test, type Page } from '@playwright/test';
import { openAsShared } from './account';
import {
	addPerson,
	createShared,
	deleteShared,
	inDays,
	name,
	newTrip,
	openKits,
	openTrips,
	sheet,
	trip
} from './households';

// 320 px est l'écran le plus étroit qu'on vise. Sur la rangée de titre d'une
// carte, le nom est le seul élément qui puisse rétrécir : tout ce qu'on y
// pose d'incompressible se paie sur lui, jusqu'à ne plus rien en laisser.
test.use({ viewport: { width: 320, height: 640 } });

async function expectNamesReadable(page: Page, count: number) {
	const names = page.getByTestId('trip-item-name');
	await expect(names).toHaveCount(count);
	const drawn = await names.evaluateAll((spans) =>
		spans.map((span) => ({
			shown: Math.ceil(span.getBoundingClientRect().width),
			natural: span.scrollWidth
		}))
	);
	// Un nom long se tronque, c'est voulu ; ce qui ne doit pas arriver, c'est
	// qu'il n'en reste rien à lire.
	for (const one of drawn) expect(one.shown).toBeGreaterThanOrEqual(Math.min(one.natural, 60));
}

test('le nom d’un objet reste lisible sur un écran de 320 px', async ({ page }) => {
	await openAsShared(page);
	const shared = await createShared(page, name('etroit'));
	await addPerson(page, 'Léa');
	await addPerson(page, 'Paul');

	await openKits(page);
	const sac = name('sac');
	await page.getByRole('button', { name: 'Nouveau kit' }).click();
	await sheet(page).getByLabel('Nom du kit').fill(sac);
	await sheet(page).getByRole('button', { name: 'Créer' }).click();
	await expect(page.getByRole('link', { name: sac })).toBeVisible();

	await openTrips(page);
	const corse = name('corse');
	await newTrip(page, corse, inDays(9), ['Léa', 'Paul']);
	await trip(page, corse).getByRole('link').click();

	const objects = ['Sac', 'Trousse de toilette complète pour deux semaines'];
	for (const object of objects) {
		await page.getByRole('combobox').click();
		await page.keyboard.type(object);
		await page.getByTestId('item-create').click();
		await expect(page.locator('li[data-trip-item]').filter({ hasText: object })).toBeVisible();
	}

	await expectNamesReadable(page, objects.length);

	// Les puces de kit partagent la rangée avec le nom : la carte en porte une
	// avant d'être mesurée une seconde fois.
	await page.getByRole('button', { name: `Ouvrir « ${objects[0]} »` }).click();
	await sheet(page).getByTestId('sheet-kits').click();
	await sheet(page)
		.getByRole('button', { name: `Ajouter à ${sac}` })
		.click();
	await sheet(page).getByRole('button', { name: 'Ajouter', exact: true }).click();
	await page.getByRole('button', { name: 'Fermer' }).click();
	await expect(page.locator('li[data-trip-item]').filter({ hasText: sac })).toBeVisible();

	await expectNamesReadable(page, objects.length);

	await deleteShared(page, shared);
});
