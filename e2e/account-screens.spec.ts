import { expect, test, type Page } from '@playwright/test';
import { PASSWORD } from './account';

const NARROW = [320, 390, 430];

const SCREENS = [
	'/account/login',
	'/account/signup',
	'/account/password/reset',
	'/account/password/reset/key/pas-une-cle',
	'/account/verify-email/pas-une-cle',
	'/invitations/pas-un-jeton'
];

function spilled(page: Page) {
	return page.evaluate(() =>
		[...document.querySelectorAll('body *')].some(
			(element) => element.getBoundingClientRect().right > window.innerWidth + 1
		)
	);
}

test('les six écrans du compte tiennent dans un téléphone, sans barre de navigation', async ({
	page
}) => {
	for (const width of NARROW) {
		await page.setViewportSize({ width, height: 720 });

		for (const path of SCREENS) {
			await page.goto(path);

			await expect(page.getByRole('heading', { level: 1 }), `${path} à ${width} px`).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0);
			expect(await spilled(page), `${path} à ${width} px`).toBe(false);
		}
	}
});

test('les champs et le bouton sont à la taille du pouce', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/account/login');

	for (const label of ['Adresse email', 'Mot de passe']) {
		const field = await page.getByLabel(label, { exact: true }).boundingBox();
		expect(field?.height ?? 0, label).toBeGreaterThanOrEqual(46);
	}

	const eye = await page.getByRole('button', { name: 'Afficher le mot de passe' }).boundingBox();
	expect(eye?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(eye?.height ?? 0).toBeGreaterThanOrEqual(44);

	const submit = await page.getByRole('button', { name: 'Se connecter' }).boundingBox();
	expect(submit?.height ?? 0).toBeGreaterThanOrEqual(48);
	expect(submit?.width ?? 0).toBeGreaterThan(240);
});

test('le bouton de validation reste atteignable quand le clavier mange l’écran', async ({
	page
}) => {
	const height = 380;
	await page.setViewportSize({ width: 390, height });
	await page.goto('/account/login');
	await page.getByLabel('Adresse email').fill('camille@example.com');
	await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);

	const submit = page.getByRole('button', { name: 'Se connecter' });
	await submit.scrollIntoViewIfNeeded();

	const box = await submit.boundingBox();
	expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
	expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
	await expect(submit).toBeEnabled();
});
