import { expect, test } from '@playwright/test';
import { address, expectRefusalShown, logOut, openAsShared, register } from './account';
import {
	addPerson,
	closeMenu,
	createShared,
	deleteShared,
	menu,
	name,
	openPerson,
	openPersonal,
	openSwitcher,
	personRow,
	sheet
} from './households';
import { forget } from './mailpit';

test('l’accueil mène aux voyages du foyer personnel, nommé « Personnel »', async ({ page }) => {
	await openAsShared(page);
	await page.goto('/');

	await expect(page).toHaveURL(/\/households\/\d+\/trips$/);
	await expect(page.getByTestId('household-switcher')).toHaveText('Personnel');
	await expect(
		page
			.getByRole('navigation', { name: 'Navigation principale' })
			.getByRole('link', { name: 'Voyages' })
	).toHaveAttribute('aria-current', 'page');
});

test('le foyer d’un autre compte répond 404', async ({ page }) => {
	const owner = address('owner');

	await register(page, owner);
	const [theirs] = await (await page.request.get('/api/households/')).json();
	await logOut(page);

	await openAsShared(page);
	await page.goto(`/households/${theirs.id}`);

	await expect(page.getByText('Ce foyer n’existe pas.')).toBeVisible();

	await forget(owner);
});

test('le dernier foyer visité est celui où l’on revient', async ({ page }) => {
	await openAsShared(page);
	await page.goto('/');
	const home = new URL(page.url()).pathname;

	const shared = await createShared(page, name('retour'));
	expect(new URL(page.url()).pathname).not.toBe(home);
	const visited = new URL(page.url()).pathname;

	await page.goto('/account/login');
	await page.goto('/');

	await expect(page).toHaveURL(`${visited}/trips`);

	await deleteShared(page, shared);
});

test('ajouter une personne, la renommer, puis renommer le foyer', async ({ page }) => {
	await openAsShared(page);
	const shared = await createShared(page, name('famille'));

	await addPerson(page, 'Léo');
	await expect(personRow(page, 'Léo')).toContainText('sans compte');

	await openPerson(page, 'Léo');
	await menu(page).getByRole('menuitem', { name: 'Renommer' }).click();
	await sheet(page).getByLabel('Nouveau nom de Léo').fill('Léa');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('persons')).toContainText('Léa');

	const renamed = name('chez-nous');
	await page.getByRole('button', { name: 'Renommer le foyer' }).click();
	await expect(sheet(page)).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(sheet(page)).toHaveCount(0);

	await page.getByRole('button', { name: 'Renommer le foyer' }).click();
	await sheet(page).getByLabel('Nom du foyer').fill(renamed);
	await sheet(page).getByRole('button', { name: 'Renommer' }).click();
	await expect(page.getByTestId('household-switcher')).toHaveText(renamed);

	await deleteShared(page, { ...shared, name: renamed });
});

test('le dernier membre se voit offrir la suppression, jamais le départ', async ({ page }) => {
	await openAsShared(page);
	const shared = await createShared(page, name('seul'));
	const email = page.getByTestId('persons').getByRole('listitem').first();

	await email.getByRole('button').click();
	await expect(menu(page).getByRole('menuitem', { name: 'Quitter ce foyer' })).toHaveCount(0);
	await expect(menu(page).getByRole('menuitem', { name: 'Supprimer ce foyer' })).toBeVisible();
	await closeMenu(page);

	await deleteShared(page, shared);
});

test('le retrait d’une personne rappelle le sort des lignes de voyage', async ({ page }) => {
	await openAsShared(page);
	const shared = await createShared(page, name('mamie'));

	await addPerson(page, 'Mamie');
	await openPerson(page, 'Mamie');
	await menu(page).getByRole('menuitem', { name: 'Retirer du foyer' }).click();

	await expect(sheet(page)).toContainText('deviennent communes au voyage');
	await sheet(page).getByRole('button', { name: 'Retirer du foyer' }).click();

	await expect(page.getByTestId('persons')).not.toContainText('Mamie');

	await deleteShared(page, shared);
});

test('le foyer personnel n’a que ses statuts', async ({ page }) => {
	await openAsShared(page);
	await openPersonal(page);

	await expect(page.getByTestId('household-switcher')).toHaveText('Personnel');
	await expect(page.getByTestId('statuses')).toBeVisible();
	await expect(page.getByTestId('persons')).toHaveCount(0);
	await expect(page.getByTestId('invitations')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Ajouter une personne' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Quitter ce foyer' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Renommer le foyer' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Supprimer ce foyer' })).toHaveCount(0);
});

test('un nom trop long est refusé en le disant, pas en parlant de panne', async ({ page }) => {
	await openAsShared(page);
	await page.goto('/');

	await openSwitcher(page);
	await menu(page).getByRole('menuitem', { name: 'Nouveau foyer' }).click();
	await sheet(page).getByLabel('Nom du nouveau foyer').fill('x'.repeat(101));
	await sheet(page).getByRole('button', { name: 'Créer' }).click();

	await expectRefusalShown(page);
	await expect(page.getByRole('alert')).not.toContainText('injoignable');
});

test('une longue adresse ne pousse rien hors de l’écran d’un téléphone', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openAsShared(page);
	const shared = await createShared(page, name('debordement'));
	const guest = `une-adresse-vraiment-tres-longue-qui-ne-tient-pas-sur-une-ligne-${Date.now()}@example.com`;

	await addPerson(page, 'Léo');
	await page.getByRole('button', { name: 'Envoyer une invitation' }).click();
	await sheet(page).getByLabel('Inviter une adresse').fill(guest);
	await sheet(page).getByRole('button', { name: 'Inviter' }).click();
	await expect(page.getByTestId('invitations')).toContainText(guest);

	const sideways = await page.evaluate(() => {
		const scroller = document.querySelector('.overflow-y-auto');
		return scroller ? scroller.scrollWidth - scroller.clientWidth : -1;
	});
	expect(sideways).toBe(0);

	await deleteShared(page, shared);
	await forget(guest);
});
