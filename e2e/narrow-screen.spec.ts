import { expect, test, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { createShared, deleteShared, inDays, name, openTrips, sheet } from './households';

// Le plus étroit des téléphones encore servis. Les deux écrans mesurés ici sont
// ceux dont l'en-tête porte le plus de monde : le voyage a son retour, son nom,
// sa date, son bouton de tri et son crayon ; le kit a son retour, son nom, sa
// description et trois boutons.
const NARROW = { width: 320, height: 640 };

const LONG = 'Week-end en Sologne avec les cousins, les voisins et le chien';

// Le contenu de l'app défile dans des div imbriqués, pas sur le document : un
// en-tête qui déborde de côté ne laisse de trace que sur l'un de ses ancêtres,
// et lequel dépend de la mise en page. Ils sont donc tous mesurés, le document
// compris, et le pire l'emporte.
function sideways(page: Page) {
	return page.evaluate(() => {
		let worst = 0;
		// Depuis le parent : les boutons de l'en-tête élargissent leur cible au
		// doigt par un pseudo-élément qui dépasse de cinq pixels de leur boîte,
		// mais reste dans la gouttière de la page et ne sort donc rien de l'écran.
		let node = document.querySelector('header')!.parentElement;
		while (node) {
			worst = Math.max(worst, node.scrollWidth - node.clientWidth);
			node = node.parentElement;
		}
		return worst;
	});
}

async function expectHeaderInScreen(page: Page, titled: string) {
	await expect(page.getByTestId('screen-title')).toHaveText(titled);
	await expect(page.getByTestId('subtitle')).toBeVisible();
	expect(await sideways(page), 'rien ne dépasse de la zone visible').toBe(0);
	await expect(page.getByTestId('screen-title')).toBeInViewport();
	await expect(page.getByTestId('subtitle')).toBeInViewport();
}

test('l’en-tête d’un voyage au nom long tient dans un téléphone de 320 px', async ({ page }) => {
	await page.setViewportSize(NARROW);
	await openAsShared(page);
	const shared = await createShared(page, name('étroit'));

	await openTrips(page);
	const voyage = name(LONG);
	await page.getByRole('button', { name: 'Nouveau voyage' }).click();
	await page.getByLabel('Nom du voyage').fill(voyage);
	await page.getByLabel('Date de départ').fill(inDays(3));
	await page.getByRole('button', { name: 'Créer' }).click();

	await expectHeaderInScreen(page, voyage);
	await expect(page.getByRole('button', { name: 'Modifier le voyage' })).toBeInViewport();

	await deleteShared(page, shared);
});

test('l’en-tête d’un kit au nom et à la description longs y tient aussi', async ({ page }) => {
	await page.setViewportSize(NARROW);
	await openAsShared(page);
	const shared = await createShared(page, name('étroit'));

	await page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Kits' })
		.click();
	const kit = name(LONG);
	await page.getByRole('button', { name: 'Nouveau kit' }).click();
	await sheet(page).getByLabel('Nom du kit').fill(kit);
	await sheet(page)
		.getByLabel('Description')
		.fill('Tout ce qu’il faut pour dormir dehors, du sac de couchage au réchaud');
	await sheet(page).getByRole('button', { name: 'Créer' }).click();
	await page.getByRole('link', { name: kit }).click();

	await expectHeaderInScreen(page, kit);
	for (const action of [
		'Modifier le kit',
		'Copier vers un autre foyer',
		'Déplacer vers un autre foyer'
	]) {
		await expect(page.getByRole('button', { name: action })).toBeInViewport();
	}

	await deleteShared(page, shared);
});
