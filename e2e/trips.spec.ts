import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAsShared } from './account';
import {
	addPerson,
	createShared,
	deleteShared,
	inDays,
	name,
	openTrips,
	sheet,
	trip
} from './households';

function archives(page: Page) {
	return page.getByTestId('trips-archived');
}

async function visitDetail(
	page: Page,
	opens: Locator,
	holds: string,
	options?: { force: boolean }
) {
	await opens.click(options);
	await expect(page.getByTestId('screen-title')).toHaveText(holds);
	await page.getByRole('link', { name: 'Retour' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText('Voyages');
}

async function act(page: Page, holds: string, action: string) {
	await trip(page, holds).getByRole('button').click();
	await page.getByRole('menu').getByRole('menuitem', { name: action }).click();
}

// Creating a trip is a screen of its own now, not a dialog: it carries the
// participants and the kits, which no bottom sheet had room for.
async function newTrip(page: Page, wanted: string, date: string, going: string[] = []) {
	await page.getByRole('button', { name: 'Nouveau voyage' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText('Nouveau voyage');
	await expect(page.getByLabel('Date de départ')).toHaveValue(inDays(0));
	await page.getByLabel('Nom du voyage').fill(wanted);
	await page.getByLabel('Date de départ').fill(date);
	for (const who of going) {
		await page.getByRole('button', { name: `Fait partir ${who}` }).click();
	}
	await page.getByRole('button', { name: 'Créer' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText(wanted);
	await page.getByRole('link', { name: 'Retour' }).click();
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

	await visitDetail(page, card.getByRole('link'), corse);
	await visitDetail(page, card.locator('> svg'), corse, { force: true });

	await act(page, corse, 'Archiver');
	await expect(archives(page)).toContainText(corse);
	await expect(archives(page).locator('[data-testid^="trip-"]')).not.toContainText('dans 9 jours');
	await visitDetail(
		page,
		archives(page).locator('[data-testid^="trip-"]').getByRole('link'),
		corse
	);

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

function objectNames(page: Page) {
	return page
		.locator('li[data-trip-item] button[aria-label^="Ouvrir"]')
		.evaluateAll((rows) => rows.map((row) => row.querySelector('span')!.textContent!.trim()));
}

function lineOf(page: Page, item: string, who: string) {
	return page
		.locator('li[data-trip-item]')
		.filter({ hasText: item })
		.getByRole('listitem')
		.filter({ has: page.getByRole('button', { name: `Un de plus pour ${who}` }) });
}

async function openFilters(page: Page) {
	await page.getByRole('button', { name: 'Filtres' }).click();
	await expect(sheet(page)).toBeVisible();
}

async function closeFilters(page: Page) {
	await page.getByRole('button', { name: 'Fermer' }).click();
	await expect(sheet(page)).toHaveCount(0);
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

test('un voyage se remplit, ses lignes avancent au doigt, et l’ordre tient au rechargement', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('préparation'));
	await addPerson(page, 'Léa');
	await addPerson(page, 'Paul');

	await openTrips(page);
	const corse = name('corse');
	await newTrip(page, corse, inDays(9), ['Léa', 'Paul']);
	await trip(page, corse).getByRole('link').click();
	await expect(page.getByTestId('trip-empty')).toBeVisible();

	for (const object of ['Tente', 'Brosse à dents']) {
		await page.getByRole('combobox').click();
		await page.keyboard.type(object);
		await page.getByTestId('item-create').click();
		await expect(page.locator('li[data-trip-item]').filter({ hasText: object })).toBeVisible();
	}
	// Le dernier ajouté est en tête : l'API pose une ligne créée au début de la
	// collection, pour la mettre sous les yeux de qui vient de l'écrire.
	await expect.poll(() => objectNames(page)).toEqual(['Brosse à dents', 'Tente']);

	// La jauge compte les lignes prêtes : trois statuts, aucune ne l'est encore.
	await expect(page.getByTestId('trip-progress')).toHaveAccessibleName('0 sur 2 prêts');
	const first = lineOf(page, 'Tente', 'Tout le monde');
	await first.getByRole('button', { name: 'Un de plus pour Tout le monde' }).click();
	await expect(first).toContainText('2');

	await first.getByRole('button', { name: /^Tente pour Tout le monde/ }).click();
	await first.getByRole('button', { name: /^Tente pour Tout le monde/ }).click();
	await expect(page.getByTestId('trip-progress')).toHaveAccessibleName('1 sur 2 prêts');

	await dragAbove(
		page,
		page.getByTestId(/^trip-item-handle-/).last(),
		page.locator('li[data-trip-item]').first()
	);
	await expect.poll(() => objectNames(page)).toEqual(['Tente', 'Brosse à dents']);
	await page.reload();
	await expect(page.locator('li[data-trip-item]')).toHaveCount(2);
	await expect.poll(() => objectNames(page)).toEqual(['Tente', 'Brosse à dents']);

	// La feuille de l'objet porte toutes ses lignes, et son crayon le renomme.
	await page.getByRole('button', { name: 'Ouvrir « Tente »' }).click();
	await expect(sheet(page)).toContainText('Tout le monde');
	await sheet(page).getByRole('button', { name: 'Modifier l’objet « Tente »' }).click();
	await sheet(page).getByLabel('Description de l’objet').fill('Deux places');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(sheet(page)).toContainText('Deux places');
	await page.getByRole('button', { name: 'Fermer' }).click();
	await expect(page.locator('li[data-trip-item]').filter({ hasText: 'Tente' })).toContainText(
		'Deux places'
	);

	// Un filtre laisse le tri et l'ancre : la ligne de Léa n'existe que sur un objet.
	await page.getByRole('button', { name: 'Ouvrir « Brosse à dents »' }).click();
	for (const who of ['Léa', 'Paul']) {
		await sheet(page)
			.getByRole('button', { name: `Ajouter une ligne pour ${who}` })
			.click();
	}
	await page.getByRole('button', { name: 'Fermer' }).click();
	// Les trois rangées ont quitté l'écran : un bouton posé à côté du champ les
	// ouvre, et porte le nombre de filtres actifs.
	await expect(page.getByRole('group', { name: 'Personnes' })).toHaveCount(0);
	const people = sheet(page).getByRole('group', { name: 'Personnes' });
	const statuses = sheet(page).getByRole('group', { name: 'Statuts' });

	await openFilters(page);
	await people.getByRole('button', { name: 'Léa' }).click();
	await closeFilters(page);
	await expect(page.getByTestId('trip-filters-open')).toHaveText('1');
	await expect(lineOf(page, 'Brosse à dents', 'Léa')).toBeVisible();
	await expect(lineOf(page, 'Brosse à dents', 'Paul')).toHaveCount(0);
	await expect.poll(() => objectNames(page)).toEqual(['Tente', 'Brosse à dents']);
	await page.getByRole('button', { name: /^Trier par nom/ }).click();
	await expect.poll(() => objectNames(page)).toEqual(['Brosse à dents', 'Tente']);

	// Une deuxième capsule de la même rangée s'ajoute à la première.
	await openFilters(page);
	await people.getByRole('button', { name: 'Paul' }).click();
	await expect(people.getByRole('button', { name: 'Tous' })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	await closeFilters(page);
	await expect(page.getByTestId('trip-filters-open')).toHaveText('2');
	await expect(lineOf(page, 'Brosse à dents', 'Léa')).toBeVisible();
	await expect(lineOf(page, 'Brosse à dents', 'Paul')).toBeVisible();

	// Les rangées se croisent : la tente porte la ligne commune que le filtre
	// personne laisse passer, mais pas le statut d'abord retenu.
	await openFilters(page);
	await statuses.getByRole('button', { name: 'Pas préparé' }).click();
	await closeFilters(page);
	await expect.poll(() => objectNames(page)).toEqual(['Brosse à dents']);
	await openFilters(page);
	await statuses.getByRole('button', { name: 'Dans les sacs' }).click();
	await closeFilters(page);
	await expect.poll(() => objectNames(page)).toEqual(['Brosse à dents', 'Tente']);

	// « Tous » est la sortie de la rangée, et il se rallume seul quand le dernier
	// choix de l'autre rangée est décoché.
	await openFilters(page);
	await statuses.getByRole('button', { name: 'Tous' }).click();
	await expect(statuses.getByRole('button', { name: 'Tous' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	for (const who of ['Léa', 'Paul']) {
		await people.getByRole('button', { name: who }).click();
	}
	await expect(people.getByRole('button', { name: 'Tous' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await closeFilters(page);
	await expect(page.getByTestId('trip-filters-open')).toHaveText('');

	// Les filtres ne portent pas sur les résultats de recherche : le bouton s'en
	// va avec les rangées qu'il a remplacées.
	await page.getByTestId('item-field').fill('Tente');
	await expect(page.getByTestId('trip-filters-open')).toHaveCount(0);
	await page.getByTestId('item-field').fill('');
	await expect(page.getByTestId('trip-filters-open')).toBeVisible();

	// Le voyage part avant le foyer : le retrait d'une personne dont l'objet est
	// aussi pris en commun casse encore côté API (AxineTeam/tout-pris-api#101).
	await page.getByRole('link', { name: 'Retour' }).click();
	await act(page, corse, 'Supprimer');
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(page.getByTestId('trips-empty')).toBeVisible();

	await deleteShared(page, shared);
});

function openKits(page: Page) {
	return page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Kits' })
		.click();
}

function kitLineOf(page: Page, item: string, who: string) {
	return page
		.locator('[data-row]')
		.filter({ hasText: item })
		.getByRole('listitem')
		.filter({ has: page.getByRole('button', { name: `Un de plus pour ${who}` }) });
}

test('un objet d’un voyage rejoint un kit avec ses personnes et ses quantités', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('rangement'));
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
	await newTrip(page, corse, inDays(5), ['Léa', 'Paul']);
	await trip(page, corse).getByRole('link').click();

	const lampe = name('lampe');
	await page.getByRole('combobox').click();
	await page.keyboard.type(lampe);
	await page.getByTestId('item-create').click();
	await expect(lineOf(page, lampe, 'Tout le monde')).toBeVisible();

	await page.getByRole('button', { name: `Ouvrir « ${lampe} »` }).click();
	for (const who of ['Léa', 'Paul']) {
		await sheet(page)
			.getByRole('button', { name: `Ajouter une ligne pour ${who}` })
			.click();
	}
	await page.getByRole('button', { name: 'Fermer' }).click();
	await lineOf(page, lampe, 'Paul').getByRole('button', { name: 'Un de plus pour Paul' }).click();
	await expect(lineOf(page, lampe, 'Paul')).toContainText('2');

	await page.getByRole('button', { name: `Ouvrir « ${lampe} »` }).click();
	await sheet(page).getByTestId('sheet-kits').click();
	await sheet(page)
		.getByRole('button', { name: `Ajouter à ${sac}` })
		.click();
	await sheet(page).getByRole('button', { name: 'Ajouter', exact: true }).click();

	// La fiche revient, et sa pastille dit que c'est fait.
	await expect(sheet(page).getByTestId('sheet-kits')).toBeVisible();
	await expect(sheet(page)).toContainText(sac);

	// Le kit sert désormais l'objet : sa case reste cochée et verrouillée, donc
	// un second passage ne peut plus doubler ses lignes.
	await sheet(page).getByTestId('sheet-kits').click();
	const served = sheet(page).getByRole('button', { name: `« ${sac} » contient déjà cet objet` });
	await expect(served).toContainText('déjà dans ce kit');
	await expect(served).toBeDisabled();
	await expect(sheet(page).getByRole('button', { name: 'Ajouter', exact: true })).toBeDisabled();

	await page.getByRole('button', { name: 'Fermer' }).click();
	await page.getByRole('button', { name: 'Fermer' }).click();

	await openKits(page);
	await page.getByRole('link', { name: sac }).click();
	await expect(page.getByTestId('screen-title')).toHaveText(sac);
	await expect(kitLineOf(page, lampe, 'Tout le monde')).toContainText('1');
	await expect(kitLineOf(page, lampe, 'Léa')).toContainText('1');
	await expect(kitLineOf(page, lampe, 'Paul')).toContainText('2');

	// Le voyage part avant le foyer : le retrait d'une personne dont l'objet est
	// aussi pris en commun casse encore côté API (AxineTeam/tout-pris-api#101).
	await openTrips(page);
	await act(page, corse, 'Supprimer');
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(trip(page, corse)).toHaveCount(0);

	await deleteShared(page, shared);
});
