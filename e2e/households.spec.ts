import { expect, test } from '@playwright/test';
import { address, register, signInShared } from './account';
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
	await page.goto('/');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();

	await signInShared(page);
	await page.goto(`/households/${theirs.id}`);

	await expect(page.getByText('Ce foyer n’existe pas.')).toBeVisible();

	await forget(owner);
});

test('le dernier foyer visité est celui où l’on revient', async ({ page }) => {
	await signInShared(page);
	await page.goto('/');
	await expect(page).toHaveURL(/\/households\/\d+$/);
	const visited = new URL(page.url()).pathname;

	await page.goto('/account/login');
	await page.goto('/');

	await expect(page).toHaveURL(visited);
});
