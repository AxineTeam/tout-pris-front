import { expect, test } from '@playwright/test';
import { address, logOut, register, signInShared } from './account';
import { createShared, deleteShared, name } from './households';
import { forget } from './mailpit';

test('l’accueil mène au foyer personnel, nommé « Personnel »', async ({ page }) => {
	await signInShared(page);
	await page.goto('/');

	await expect(page).toHaveURL(/\/households\/\d+$/);
	await expect(page.getByTestId('household-name')).toHaveText('Personnel');
	await expect(page.getByRole('link', { name: 'Personnel' })).toHaveAttribute(
		'aria-current',
		'page'
	);
});

test('le foyer d’un autre compte répond 404', async ({ page }) => {
	const owner = address('owner');

	await register(page, owner);
	const [theirs] = await (await page.request.get('/api/households/')).json();
	await logOut(page);

	await signInShared(page);
	await page.goto(`/households/${theirs.id}`);

	await expect(page.getByText('Ce foyer n’existe pas.')).toBeVisible();

	await forget(owner);
});

test('le dernier foyer visité est celui où l’on revient', async ({ page }) => {
	await signInShared(page);
	await page.goto('/');
	const home = new URL(page.url()).pathname;

	const shared = await createShared(page, name('retour'));
	expect(new URL(page.url()).pathname).not.toBe(home);
	const visited = new URL(page.url()).pathname;

	await page.goto('/account/login');
	await page.goto('/');

	await expect(page).toHaveURL(visited);

	await deleteShared(page, shared);
});

test('créer un foyer partagé, y ajouter une personne, la renommer puis la supprimer', async ({
	page
}) => {
	await signInShared(page);
	const shared = await createShared(page, name('famille'));

	await expect(page.getByTestId('household-name')).toHaveText(shared.name);

	await page.getByLabel('Ajouter une personne').fill('Léo');
	await page.getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId('persons')).toContainText('Léo');

	await page.getByRole('button', { name: 'Renommer Léo' }).click();
	await page.getByLabel('Nouveau nom de Léo').fill('Léa');
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('persons')).toContainText('Léa');

	await page.getByRole('button', { name: 'Supprimer Léa' }).click();
	await expect(page.getByTestId('persons')).not.toContainText('Léa');

	const renamed = name('chez-nous');
	await page.getByLabel('Nom du foyer').fill(renamed);
	await page.getByRole('button', { name: 'Renommer', exact: true }).click();
	await expect(page.getByTestId('household-name')).toHaveText(renamed);
	await expect(page.getByRole('link', { name: renamed })).toBeVisible();

	await deleteShared(page, { ...shared, name: renamed });
});

test('la personne qui porte le compte du dernier membre ne se supprime pas', async ({ page }) => {
	await signInShared(page);
	const shared = await createShared(page, name('seul'));

	await expect(page.getByTestId('alone')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Quitter ce foyer' })).toHaveCount(0);

	const me = page.getByTestId('persons').getByRole('listitem').first();
	await me.getByRole('button', { name: /^Supprimer / }).click();

	await expect(
		page.getByText('A person whose account is still a member cannot be deleted.')
	).toBeVisible();

	await deleteShared(page, shared);
});

test('le foyer personnel n’a rien à partager', async ({ page }) => {
	await signInShared(page);
	await page.goto('/');

	await expect(page.getByTestId('household-name')).toHaveText('Personnel');
	await expect(page.getByLabel('Nom du foyer')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Supprimer ce foyer' })).toHaveCount(0);
	await expect(page.getByLabel('Ajouter une personne')).toBeVisible();
});

test('un nom trop long est refusé en le disant, pas en parlant de panne', async ({ page }) => {
	await signInShared(page);
	await page.goto('/');

	await page.getByRole('button', { name: 'Nouveau foyer' }).click();
	await page.getByLabel('Nom du nouveau foyer').fill('x'.repeat(101));
	await page.getByRole('button', { name: 'Créer' }).click();

	const alert = page.getByRole('alert');
	await expect(alert).toContainText('no more than 100 characters');
	await expect(alert).not.toContainText('injoignable');
});
