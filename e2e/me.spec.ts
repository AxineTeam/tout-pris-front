import { expect, test, type Page } from '@playwright/test';
import {
	PASSWORD,
	address,
	expectRefusalShown,
	logIn,
	logOut,
	openAsShared,
	register
} from './account';
import { forget } from './mailpit';

// Le contenu d'un Select bits-ui arme ses écouteurs après son montage : une
// option visible n'est pas encore une option cliquable.
async function choose(page: Page, control: string, language: string) {
	await page.getByRole('button', { name: control }).click();
	const option = page.getByRole('option', { name: language });
	await expect(option).toBeVisible();
	await option.click();
}

test('changer son mot de passe, puis se connecter avec le nouveau', async ({ page }) => {
	const email = address('me-password');
	const renewed = 'un-tout-autre-mot-de-passe';

	await register(page, email);
	await page.goto('/me');
	await expect(page.getByTestId('account-display')).toHaveText(email.split('@')[0]);

	await page.getByLabel('Mot de passe actuel', { exact: true }).fill('pas-le-bon');
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(renewed);
	await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
	await expectRefusalShown(page);

	await page.getByLabel('Mot de passe actuel', { exact: true }).fill(PASSWORD);
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(renewed);
	await page.getByRole('button', { name: 'Changer mon mot de passe' }).click();
	await expect(page.getByTestId('password-changed')).toBeVisible();

	await logOut(page);
	await logIn(page, email, renewed);
	await expect(page).toHaveURL(/\/households\/\d+\/trips$/);

	await forget(email);
});

test('chaque œil de l’écran nomme le champ qu’il dévoile', async ({ page }) => {
	await openAsShared(page);
	await page.goto('/me');

	const current = page.getByLabel('Mot de passe actuel', { exact: true });
	await page.getByRole('button', { name: 'Afficher le mot de passe actuel' }).click();

	await expect(current).toHaveAttribute('type', 'text');
	await expect(page.getByLabel('Nouveau mot de passe', { exact: true })).toHaveAttribute(
		'type',
		'password'
	);
});

test('ajouter puis supprimer une adresse secondaire', async ({ page }) => {
	const second = address('me-email-second');

	await openAsShared(page);
	await page.goto('/me');

	const addresses = page.getByTestId('email-addresses');
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await page.getByLabel('Ajouter une adresse').fill(second);
	await page.getByRole('button', { name: 'Ajouter' }).click();

	const added = addresses.getByRole('listitem').filter({ hasText: second });
	await expect(added).toContainText('non vérifiée');

	await added.getByRole('button', { name: 'Supprimer' }).click();
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await page.reload();
	await expect(addresses.getByRole('listitem')).toHaveCount(1);

	await forget(second);
});

test('choisir sa langue retourne l’application, et le rechargement la garde', async ({ page }) => {
	const email = address('me-language');

	await register(page, email);
	await page.goto('/me');
	await expect(page.getByRole('heading', { name: 'Mon compte', level: 1 })).toBeVisible();

	await choose(page, 'Choix de la langue Français', 'English');

	await expect(page.getByRole('heading', { name: 'My account', level: 1 })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Language choice English' })).toBeVisible();
	await expect(page.getByTestId('account-display')).toHaveText(email.split('@')[0]);
	await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();

	await page.reload();

	await expect(page.getByRole('heading', { name: 'My account', level: 1 })).toBeVisible();
	await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();

	await choose(page, 'Language choice English', 'Français');

	await expect(page.getByRole('heading', { name: 'Mon compte', level: 1 })).toBeVisible();
	await expect(page.getByLabel('Mot de passe actuel', { exact: true })).toBeVisible();

	await forget(email);
});

test('choisir le thème sombre en un clic, et le rechargement le garde', async ({ page }) => {
	await openAsShared(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/me');

	const themes = page.getByRole('group', { name: 'Choix du thème' });
	const dark = themes.getByRole('button', { name: 'Sombre' });
	await expect(themes.getByRole('button', { name: 'Système' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	for (const name of ['Système', 'Clair', 'Sombre']) {
		const box = await themes.getByRole('button', { name }).boundingBox();
		expect(box!.height).toBeGreaterThanOrEqual(44);
	}
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		)
	).toBeLessThanOrEqual(0);

	await dark.click();
	await expect(dark).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('html')).toHaveClass(/dark/);

	await page.reload();

	await expect(page.locator('html')).toHaveClass(/dark/);
	await expect(themes.getByRole('button', { name: 'Sombre' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});
