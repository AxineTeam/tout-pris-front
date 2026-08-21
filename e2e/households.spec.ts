import { expect, test } from '@playwright/test';
import { address, register } from './account';
import { forget } from './mailpit';

test('l’accueil mène au foyer personnel, nommé « Personnel »', async ({ page }) => {
	const email = address('household');

	await register(page, email);
	await page.goto('/');

	await expect(page).toHaveURL(/\/households\/\d+$/);
	await expect(page.getByTestId('household-name')).toHaveText('Personnel');
	await expect(page.getByRole('link', { name: 'Personnel' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await forget(email);
});

test('le foyer d’un autre compte répond 404', async ({ page }) => {
	const owner = address('owner');
	const intruder = address('intruder');

	await register(page, owner);
	const [theirs] = await (await page.request.get('/api/households/')).json();
	await page.goto('/');
	await page.getByRole('button', { name: 'Se déconnecter' }).click();

	await register(page, intruder);
	await page.goto(`/households/${theirs.id}`);

	await expect(page.getByText('Ce foyer n’existe pas.')).toBeVisible();

	await forget(owner);
	await forget(intruder);
});

// Indémontrable tant qu'un compte n'a qu'un foyer : `landing` s'écrit
// `find(remembered) ?? personal ?? all[0]`, et les trois branches rendent alors
// la même valeur — supprimer la mémorisation entière laisserait ce test passer.
// Il redevient probant quand créer un foyer partagé est possible, cf. back#53.
test.fixme('le dernier foyer visité est celui où l’on revient', async ({ page }) => {
	const email = address('remember');

	await register(page, email);
	await page.goto('/');
	await expect(page).toHaveURL(/\/households\/\d+$/);
	const visited = new URL(page.url()).pathname;

	await page.goto('/account/login');
	await page.goto('/');

	await expect(page).toHaveURL(visited);

	await forget(email);
});
