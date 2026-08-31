import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { addPerson, createShared, deleteShared, name, sheet } from './households';

function openKits(page: Page) {
	return page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Kits' })
		.click();
}

function group(page: Page, holds: string) {
	return page.locator('[data-row]').filter({ hasText: holds });
}

function lineOf(page: Page, item: string, who: string) {
	return group(page, item)
		.getByRole('listitem')
		.filter({ has: page.getByRole('button', { name: `Un de plus pour ${who}` }) });
}

async function dragAbove(page: Page, handle: Locator, target: Locator) {
	const grip = await handle.boundingBox();
	const landing = await target.boundingBox();
	if (!grip || !landing) throw new Error('nothing to drag');
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
	await page.mouse.down();
	await page.mouse.move(landing.x + landing.width / 2, landing.y + 4, { steps: 1 });
	await page.mouse.up();
}

function kitNames(page: Page) {
	return page
		.locator('a[data-testid^="kit-"]')
		.evaluateAll((rows) => rows.map((row) => row.querySelector('span')!.textContent!.trim()));
}

function itemNames(page: Page) {
	return page
		.locator('[data-row] button[aria-label^="Modifier l’objet"]')
		.evaluateAll((rows) => rows.map((row) => row.querySelector('span')!.textContent!.trim()));
}

async function newKit(page: Page, wanted: string, description: string) {
	await page.getByRole('button', { name: 'Nouveau kit' }).click();
	await sheet(page).getByLabel('Nom du kit').fill(wanted);
	await sheet(page).getByLabel('Description').fill(description);
	await sheet(page).getByRole('button', { name: 'Créer' }).click();
	await expect(page.getByRole('link', { name: wanted })).toBeVisible();
}

async function addItem(
	page: Page,
	wanted: string,
	who: string,
	quantity: number,
	description: string
) {
	await page.getByTestId('item-field').fill(wanted);
	await page.getByTestId('item-create').click();
	await sheet(page).getByRole('button', { name: who, exact: true }).click();
	await sheet(page).getByLabel('Description de l’objet').fill(description);
	await sheet(page).getByLabel('Quantité').fill(String(quantity));
	await sheet(page).getByRole('button', { name: 'Ajouter', exact: true }).click();
	await expect(group(page, wanted)).toBeVisible();
}

test('un kit se remplit d’objets, se partage entre les personnes, puis se supprime', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('kits'));
	await addPerson(page, 'Tom');

	await openKits(page);
	await expect(page.getByTestId('screen-title')).toHaveText('Kits');
	await expect(page.getByTestId('kits-empty')).toBeVisible();

	const kit = name('sac');
	await newKit(page, kit, 'Pour changer un enfant en déplacement');
	await expect(page.getByTestId('kits-empty')).toHaveCount(0);
	await page.getByRole('link', { name: kit }).click();
	await expect(page.getByTestId('screen-title')).toHaveText(kit);
	await expect(page.getByTestId('kit-empty')).toBeVisible();

	await addItem(page, 'Couches taille 4', 'Tom', 60, 'Compter 6 par jour');
	await expect(lineOf(page, 'Couches taille 4', 'Tom')).toContainText('60');
	await expect(group(page, 'Couches taille 4')).toContainText('Compter 6 par jour');

	await addItem(page, 'Lingettes', 'Tout le monde', 2, '');
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toContainText('2');

	await page.getByTestId('item-field').fill('couch');
	await expect(page.getByRole('option').first()).toContainText('Couches taille 4');
	await expect(page.getByRole('option').first()).toContainText('déjà dans ce kit');
	await expect(page.getByRole('option').first()).toContainText('Compter 6 par jour');
	await expect(page.getByRole('option').last()).toContainText('Créer « couch »');
	await page.getByRole('option').first().click();
	await expect(page.getByTestId('item-field')).toHaveValue('');
	await expect(page.locator('[data-row]')).toHaveCount(2);

	await group(page, 'Lingettes')
		.getByRole('button', { name: 'Ajouter une ligne pour Tom' })
		.click();
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('1');
	await lineOf(page, 'Lingettes', 'Tom')
		.getByRole('button', { name: 'Un de plus pour Tom' })
		.click();
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('2');

	await lineOf(page, 'Couches taille 4', 'Tom')
		.getByRole('button', { name: 'Un de moins pour Tom' })
		.click();
	await expect(lineOf(page, 'Couches taille 4', 'Tom')).toContainText('59');

	await group(page, 'Couches taille 4')
		.getByRole('button', { name: 'Modifier l’objet « Couches taille 4 »' })
		.click();
	await sheet(page).getByRole('button', { name: 'Retirer du kit' }).click();
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(group(page, 'Couches taille 4')).toHaveCount(0);
	await expect(page.locator('[data-row]')).toHaveCount(1);

	await lineOf(page, 'Lingettes', 'Tout le monde')
		.getByRole('button', { name: 'Un de moins pour Tout le monde' })
		.click();
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toContainText('1');
	await lineOf(page, 'Lingettes', 'Tout le monde')
		.getByRole('button', { name: 'Un de moins pour Tout le monde' })
		.click();
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toHaveCount(0);
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('2');

	await addItem(page, 'Lingette', 'Tout le monde', 1, '');
	await expect(page.locator('[data-row]')).toHaveCount(2);
	await page.getByRole('button', { name: 'Modifier l’objet « Lingette »' }).click();
	await sheet(page).getByLabel('Nom de l’objet').fill('Lingettes');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('item-merged')).toContainText('Lingettes');
	await expect(page.locator('[data-row]')).toHaveCount(1);
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('2');
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toContainText('1');

	await page.getByRole('button', { name: 'Modifier le kit' }).click();
	await sheet(page).getByRole('button', { name: 'Supprimer ce kit' }).click();
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText('Kits');
	await expect(page.getByRole('link', { name: kit })).toHaveCount(0);

	await deleteShared(page, shared);
});

test('les kits et leurs objets se rangent à la main, et l’ordre tient au rechargement', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('ordre'));
	await openKits(page);

	const first = name('alpha');
	const second = name('beta');
	await newKit(page, first, '');
	await newKit(page, second, '');
	await expect.poll(() => kitNames(page)).toEqual([first, second]);

	await dragAbove(
		page,
		page.getByTestId(/^kit-handle-/).last(),
		page.getByTestId(/^kit-\d+$/).first()
	);
	await expect.poll(() => kitNames(page)).toEqual([second, first]);
	await page.reload();
	await expect(page.getByRole('link', { name: second })).toBeVisible();
	await expect.poll(() => kitNames(page)).toEqual([second, first]);

	await page.getByRole('link', { name: second }).click();
	await addItem(page, 'Masque', 'Tout le monde', 1, '');
	await addItem(page, 'Palmes', 'Tout le monde', 2, '');
	await expect.poll(() => itemNames(page)).toEqual(['Masque', 'Palmes']);

	await dragAbove(
		page,
		page.getByTestId(/^kit-item-handle-/).last(),
		page.locator('[data-row]').first()
	);
	await expect.poll(() => itemNames(page)).toEqual(['Palmes', 'Masque']);
	await page.reload();
	await expect(page.locator('[data-row]')).toHaveCount(2);
	await expect.poll(() => itemNames(page)).toEqual(['Palmes', 'Masque']);

	await deleteShared(page, shared);
});
