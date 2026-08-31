import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { createShared, deleteShared, name, sheet } from './households';

function openTrips(page: Page) {
	return page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Voyages' })
		.click();
}

function inDays(days: number): string {
	const day = new Date();
	day.setDate(day.getDate() + days);
	const month = String(day.getMonth() + 1).padStart(2, '0');
	return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, '0')}`;
}

function trip(page: Page, holds: string) {
	return page.locator('[data-testid^="trip-"]').filter({ hasText: holds });
}

function archives(page: Page) {
	return page.getByTestId('trips-archived');
}

async function visitDetail(page: Page, opens: Locator, options?: { force: boolean }) {
	await opens.click(options);
	await expect(page.getByTestId('screen-title')).toHaveText('Voyage');
	await page.getByRole('link', { name: 'Retour' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText('Voyages');
}

async function act(page: Page, holds: string, action: string) {
	await trip(page, holds).getByRole('button').click();
	await page.getByRole('menu').getByRole('menuitem', { name: action }).click();
}

async function newTrip(page: Page, wanted: string, date: string) {
	await page.getByRole('button', { name: 'Nouveau voyage' }).click();
	await expect(sheet(page).getByLabel('Date de départ')).toHaveValue(inDays(0));
	await sheet(page).getByLabel('Nom du voyage').fill(wanted);
	await sheet(page).getByLabel('Date de départ').fill(date);
	await sheet(page).getByRole('button', { name: 'Créer' }).click();
	await expect(trip(page, wanted)).toBeVisible();
}

test('un voyage se crée, s’archive, se duplique, puis se supprime', async ({ page }) => {
	await openAsShared(page);
	const shared = await createShared(page, name('voyages'));

	await openTrips(page);
	await expect(page.getByTestId('screen-title')).toHaveText('Voyages');
	await expect(page.getByTestId('trips-empty')).toBeVisible();

	const corse = name('corse');
	await newTrip(page, corse, inDays(9));
	await expect(page.getByTestId('trips-empty')).toHaveCount(0);
	await expect(trip(page, corse)).toContainText('dans 9 jours');

	const card = trip(page, corse).locator('> div');
	await expect(card.getByRole('link'), 'le lien tient dans la carte').toBeVisible();
	await expect(card.getByRole('button'), 'le menu aussi').toBeVisible();
	expect((await page.getByRole('button', { name: 'Nouveau voyage' }).boundingBox())?.width).toBe(
		(await trip(page, corse).boundingBox())?.width
	);

	const lit = () => card.evaluate((row) => getComputedStyle(row).backgroundColor);
	const resting = await lit();
	await card.getByRole('link').hover();
	await expect.poll(lit, { message: 'la carte s’allume sous le texte' }).not.toBe(resting);
	await card.locator('> svg').hover({ force: true });
	await expect.poll(lit, { message: 'et sous le chevron' }).not.toBe(resting);
	await card.getByRole('button').hover();
	await expect.poll(lit, { message: 'mais pas sous le menu' }).toBe(resting);

	await visitDetail(page, card.getByRole('link'));
	await visitDetail(page, card.locator('> svg'), { force: true });

	await act(page, corse, 'Archiver');
	await expect(archives(page)).toContainText(corse);
	await expect(archives(page).locator('[data-testid^="trip-"]')).not.toContainText('dans 9 jours');
	await visitDetail(page, archives(page).locator('[data-testid^="trip-"]').getByRole('link'));

	await page.reload();
	await expect(archives(page)).toContainText(corse);

	await act(page, corse, 'Désarchiver');
	await expect(archives(page)).toHaveCount(0);
	await expect(trip(page, corse)).toContainText('dans 9 jours');

	await act(page, corse, 'Dupliquer');
	await expect(sheet(page).getByLabel('Nom du voyage')).toHaveValue(`${corse} (copie)`);
	await expect(sheet(page).getByLabel('Date de départ')).toHaveValue(inDays(0));
	const arcs = name('arcs');
	await sheet(page).getByLabel('Nom du voyage').fill(arcs);
	await sheet(page).getByLabel('Date de départ').fill(inDays(30));
	await sheet(page).getByRole('button', { name: 'Dupliquer' }).click();
	await expect(trip(page, arcs)).toContainText('dans 30 jours');
	await expect(trip(page, corse)).toBeVisible();

	for (const doomed of [corse, arcs]) {
		await act(page, doomed, 'Supprimer');
		await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
		await expect(trip(page, doomed)).toHaveCount(0);
	}
	await expect(page.getByTestId('trips-empty')).toBeVisible();

	await deleteShared(page, shared);
});
