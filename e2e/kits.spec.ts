import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAsShared } from './account';
import {
	addPerson,
	closeSheet,
	createShared,
	deleteShared,
	menu,
	name,
	openSwitcher,
	sheet
} from './households';

// Le collage se joue au presse-papier du navigateur, qui le refuse sans ces
// permissions. Les autres tests du fichier n'y touchent pas.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

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

// La rangée « Ajouter » de la carte ne se montre qu'appelée par le + du titre.
async function addLineFor(page: Page, item: string, who: string) {
	await expect(
		group(page, item).getByRole('button', { name: `Ajouter une ligne pour ${who}` })
	).toHaveCount(0);
	await group(page, item)
		.getByRole('button', { name: `Ajouter une ligne à « ${item} »` })
		.click();
	await group(page, item)
		.getByRole('button', { name: `Ajouter une ligne pour ${who}` })
		.click();
	await expect(lineOf(page, item, who)).toBeVisible();
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
		.locator('[data-row] [data-testid="kit-item-name"]')
		.evaluateAll((names) => names.map((name) => name.textContent!.trim()));
}

async function newKit(page: Page, wanted: string, description: string) {
	await page.getByRole('button', { name: 'Nouveau kit' }).click();
	await sheet(page).getByLabel('Nom du kit').fill(wanted);
	await sheet(page).getByLabel('Description').fill(description);
	await sheet(page).getByRole('button', { name: 'Créer' }).click();
	await expect(page.getByRole('link', { name: wanted })).toBeVisible();
}

async function addItem(page: Page, wanted: string) {
	await page.getByTestId('item-field').fill(wanted);
	await page.getByTestId('item-create').click();
	await expect(group(page, wanted)).toBeVisible();
}

async function describeItem(page: Page, item: string, description: string) {
	await group(page, item)
		.getByRole('button', { name: `Modifier l’objet « ${item} »` })
		.click();
	await sheet(page).getByLabel('Description de l’objet').fill(description);
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(group(page, item)).toContainText(description);
}

async function raise(page: Page, item: string, who: string, times: number) {
	for (let step = 0; step < times; step += 1) {
		await lineOf(page, item, who)
			.getByRole('button', { name: `Un de plus pour ${who}` })
			.click();
	}
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

	await addItem(page, 'Couches taille 4');
	await describeItem(page, 'Couches taille 4', 'Compter 6 par jour');
	await addLineFor(page, 'Couches taille 4', 'Tom');
	await raise(page, 'Couches taille 4', 'Tom', 3);
	await expect(lineOf(page, 'Couches taille 4', 'Tom')).toContainText('4');

	await addItem(page, 'Lingettes');
	await raise(page, 'Lingettes', 'Tout le monde', 1);
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toContainText('2');

	await page.getByTestId('item-field').fill('couch');
	await expect(page.getByRole('option').first()).toContainText('Couches taille 4');
	await expect(page.getByRole('option').first()).toContainText('déjà dans ce kit');
	await expect(page.getByRole('option').first()).toContainText('Compter 6 par jour');
	await expect(page.getByRole('option').last()).toContainText('Créer « couch »');
	await page.getByRole('option').first().click();
	await expect(page.getByTestId('item-field')).toHaveValue('');
	await expect(page.locator('[data-row]')).toHaveCount(2);

	await addLineFor(page, 'Lingettes', 'Tom');
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('1');
	await lineOf(page, 'Lingettes', 'Tom')
		.getByRole('button', { name: 'Un de plus pour Tom' })
		.click();
	await expect(lineOf(page, 'Lingettes', 'Tom')).toContainText('2');

	await lineOf(page, 'Couches taille 4', 'Tom')
		.getByRole('button', { name: 'Un de moins pour Tom' })
		.click();
	await expect(lineOf(page, 'Couches taille 4', 'Tom')).toContainText('3');

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

	await addItem(page, 'Lingette');
	await expect(page.locator('[data-row]')).toHaveCount(2);
	await page.getByRole('button', { name: 'Modifier l’objet « Lingette »' }).click();
	await sheet(page).getByLabel('Nom de l’objet').fill('Lingettes');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
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
	await addItem(page, 'Masque');
	await addItem(page, 'Palmes');
	// Le dernier ajouté est en tête : l'API pose une ligne créée au début de la
	// collection, pour la mettre sous les yeux de qui vient de l'écrire.
	await expect.poll(() => itemNames(page)).toEqual(['Palmes', 'Masque']);

	await dragAbove(
		page,
		page.getByTestId(/^kit-item-handle-/).last(),
		page.locator('[data-row]').first()
	);
	await expect.poll(() => itemNames(page)).toEqual(['Masque', 'Palmes']);
	await page.reload();
	await expect(page.locator('[data-row]')).toHaveCount(2);
	await expect.poll(() => itemNames(page)).toEqual(['Masque', 'Palmes']);

	await deleteShared(page, shared);
});

// Un vrai collage, pas un ClipboardEvent fabriqué : un événement posé par script
// exécute bien nos gestionnaires, mais le navigateur n'insère jamais son texte.
// Le champ resterait vide que l'on annule le collage ou non, et l'assertion qui
// compte ici ne prouverait rien.
async function pasteInField(page: Page, list: string) {
	await page.evaluate((raw) => navigator.clipboard.writeText(raw), list);
	await page.getByTestId('item-field').focus();
	await page.keyboard.press('Control+V');
}

test('une liste collée dans le champ remplit le catalogue et le kit d’un coup', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('import'));
	await openKits(page);

	const kit = name('plage');
	await newKit(page, kit, '');
	await page.getByRole('link', { name: kit }).click();
	await addItem(page, 'Gourde');

	await page.getByTestId('item-import-open').click();
	await expect(sheet(page)).toContainText('Une ligne, un objet');
	await expect(page.getByTestId('item-import-start')).toHaveCount(0);
	await closeSheet(page);

	// Un seul nom reste un nom, retour à la ligne compris — les Notes d'un
	// téléphone et une cellule de tableur en ajoutent un, et c'est le champ qui
	// le mange.
	await pasteInField(page, 'Sac à dos\n');
	await expect(sheet(page)).toHaveCount(0);
	await expect(page.getByTestId('item-field')).toHaveValue('Sac à dos');
	await page.getByTestId('item-field').fill('');

	await pasteInField(page, 'Gourde\nTente\n\nSac à dos');
	await expect(page.getByTestId('item-import-detected')).toContainText('3');
	await expect(sheet(page)).toContainText('Tente');
	await expect(page.getByTestId('item-field')).toHaveValue('');

	await page.getByTestId('item-import-start').click();
	await expect(page.getByTestId('item-import-created')).toContainText('2');
	await expect(page.getByTestId('item-import-reused')).toContainText('1');
	await expect(page.getByTestId('item-import-refused')).toContainText('0');
	await closeSheet(page);

	await expect(page.locator('[data-row]')).toHaveCount(3);
	await expect(group(page, 'Tente')).toBeVisible();
	await expect(group(page, 'Sac à dos')).toBeVisible();
	// Le kit ne porte pas deux fois l'objet que le foyer connaissait déjà.
	await expect(lineOf(page, 'Gourde', 'Tout le monde')).toHaveCount(1);

	await page.reload();
	await expect(page.locator('[data-row]')).toHaveCount(3);

	await deleteShared(page, shared);
});

async function openKitMenu(page: Page, kit: string) {
	await page.getByRole('button', { name: `Actions de « ${kit} »` }).click();
	await expect(menu(page)).toBeVisible();
	await menu(page).getByRole('menuitem', { name: 'Copier vers un autre foyer' }).click();
}

// Le sélecteur de foyer navigue côté client, et c'est la seule bascule qui
// exerce le cache : un `page.goto` repartirait d'un QueryClient vide, où
// n'importe quel écran se remplirait tout seul.
async function switchHousehold(page: Page, wanted: string) {
	await openSwitcher(page);
	await menu(page).getByRole('menuitem', { name: wanted }).click();
	await expect(page.getByTestId('household-switcher')).toHaveText(wanted);
}

test('un kit se copie dans un autre foyer, ses lignes fondues en lignes communes', async ({
	page
}) => {
	await openAsShared(page);
	const away = await createShared(page, name('arrivee'));
	const home = await createShared(page, name('depart'));
	await addPerson(page, 'Léa');

	// Les kits du foyer d'arrivée entrent au cache avant la copie : c'est ce
	// cache-là que l'invalidation doit balayer pour que le kit copié se voie.
	await switchHousehold(page, away.name);
	await openKits(page);
	await expect(page.getByTestId('kits-empty')).toBeVisible();

	await switchHousehold(page, home.name);
	const kit = name('trousse');
	await newKit(page, kit, 'Pour la salle de bain');
	await page.getByRole('link', { name: kit }).click();

	await addItem(page, 'Couches');
	await addLineFor(page, 'Couches', 'Léa');
	await raise(page, 'Couches', 'Léa', 2);
	await raise(page, 'Couches', 'Tout le monde', 1);
	await addItem(page, 'Lingettes');
	await expect.poll(() => itemNames(page)).toEqual(['Lingettes', 'Couches']);

	// Les deux entrées mènent à la même boîte : celle du kit ouvert se montre,
	// celle de la liste fait la copie.
	await page.getByRole('button', { name: 'Copier vers un autre foyer' }).click();
	await expect(sheet(page)).toContainText(away.name);
	await closeSheet(page);

	await openKits(page);
	await openKitMenu(page, kit);
	await sheet(page)
		.getByRole('button', { name: `Copier vers le foyer ${away.name}` })
		.click();
	await page.getByTestId('kit-copy-start').click();
	await expect(page.getByTestId('kit-copy-done')).toHaveText(
		`2 objets copiés vers le foyer ${away.name}.`
	);
	await expect(page.getByTestId('kit-copy-refusals')).toHaveCount(0);
	await closeSheet(page);

	await switchHousehold(page, away.name);
	await page.getByRole('link', { name: kit }).click();
	await expect(page.getByTestId('subtitle')).toHaveText('Pour la salle de bain');
	await expect.poll(() => itemNames(page)).toEqual(['Lingettes', 'Couches']);
	// Léa n'existe pas ici : ses trois couches ont rejoint la ligne commune, et
	// c'est la seule que l'objet porte.
	await expect(lineOf(page, 'Couches', 'Tout le monde')).toContainText('5');
	await expect(group(page, 'Couches').getByRole('listitem')).toHaveCount(1);
	await expect(lineOf(page, 'Lingettes', 'Tout le monde')).toContainText('1');

	await deleteShared(page, home);
	await deleteShared(page, away);
});

test('un kit déplacé quitte son foyer, y laisse ses objets, et arrive entier', async ({ page }) => {
	await openAsShared(page);
	const away = await createShared(page, name('accueil'));
	const home = await createShared(page, name('origine'));

	await openKits(page);
	const kit = name('sac');
	await newKit(page, kit, '');
	await page.getByRole('link', { name: kit }).click();
	await addItem(page, 'Couches');
	await addItem(page, 'Lingettes');

	await page.getByRole('button', { name: 'Déplacer vers un autre foyer' }).click();
	await sheet(page)
		.getByRole('button', { name: `Déplacer vers le foyer ${away.name}` })
		.click();
	await page.getByTestId('kit-copy-start').click();
	await expect(page.getByTestId('kit-copy-done')).toHaveText(
		`2 objets déplacés vers le foyer ${away.name}.`
	);
	await closeSheet(page);

	// L'écran du kit déplacé n'existe plus : fermer le récapitulatif ramène à la
	// liste, pas sur un kit supprimé.
	await expect(page.getByTestId('screen-title')).toHaveText('Kits');
	await expect(page.getByRole('link', { name: kit })).toHaveCount(0);

	const left = name('reste');
	await newKit(page, left, '');
	await page.getByRole('link', { name: left }).click();
	await page.getByTestId('item-field').fill('Couch');
	await expect(page.getByRole('option').first()).toContainText('Couches');

	await page.getByRole('link', { name: 'Retour' }).click();
	await switchHousehold(page, away.name);
	await page.getByRole('link', { name: kit }).click();
	await expect.poll(() => itemNames(page)).toEqual(['Lingettes', 'Couches']);

	await deleteShared(page, home);
	await deleteShared(page, away);
});
