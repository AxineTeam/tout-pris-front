import { expect, test, type Page } from '@playwright/test';
import { signInShared } from './account';

const NARROW = [320, 390, 430];

function bar(page: Page) {
	return page.getByRole('navigation', { name: 'Navigation principale' });
}

test('les quatre onglets mènent aux quatre écrans, et l’onglet allumé survit au rechargement', async ({
	page
}) => {
	const email = await signInShared(page);
	const household = new URL(page.url()).pathname.replace(/\/trips$/, '');

	await expect(bar(page).getByRole('link', { name: 'Voyages' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(page.getByTestId('trips-empty')).toBeVisible();

	await page.reload();
	await expect(bar(page).getByRole('link', { name: 'Voyages' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await bar(page).getByRole('link', { name: 'Kits' }).click();
	await expect(page).toHaveURL(`${household}/kits`);
	await expect(bar(page).getByRole('link', { name: 'Kits' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await bar(page).getByRole('link', { name: 'Foyer' }).click();
	await expect(page).toHaveURL(household);
	await expect(bar(page).getByRole('link', { name: 'Foyer' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await bar(page).getByRole('link', { name: 'Profil' }).click();
	await expect(page).toHaveURL('/me');
	await expect(page.getByTestId('account-email')).toHaveText(email);
});

test('le sélecteur de foyer ne suit pas jusqu’au profil', async ({ page }) => {
	await signInShared(page);

	await expect(page.getByTestId('household-switcher')).toBeVisible();

	await bar(page).getByRole('link', { name: 'Profil' }).click();

	await expect(page.getByTestId('household-switcher')).toHaveCount(0);
	await expect(bar(page)).toBeVisible();
});

test('la barre reste sous le pouce, sans rien pousser hors de l’écran', async ({ page }) => {
	await signInShared(page);

	for (const width of NARROW) {
		await page.setViewportSize({ width, height: 640 });
		await page.goto('/me');
		await expect(bar(page)).toBeVisible();

		const spilled = await page.evaluate(() =>
			[...document.querySelectorAll('body *')].some(
				(element) => element.getBoundingClientRect().right > window.innerWidth + 1
			)
		);
		expect(spilled, `${width} px`).toBe(false);

		for (const label of ['Voyages', 'Kits', 'Foyer', 'Profil']) {
			const box = await bar(page).getByRole('link', { name: label }).boundingBox();
			expect(box?.height ?? 0, `${label} à ${width} px`).toBeGreaterThanOrEqual(44);
			expect(box?.width ?? 0, `${label} à ${width} px`).toBeGreaterThanOrEqual(44);
		}

		const barBox = await bar(page).boundingBox();
		expect((barBox?.y ?? 0) + (barBox?.height ?? 0), `${width} px`).toBeCloseTo(640, 0);
	}
});

test('la largeur du contenu reste bornée sur un grand écran', async ({ page }) => {
	await signInShared(page);
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/me');

	const tabs = await bar(page).getByRole('list').boundingBox();
	expect(tabs?.width ?? 0).toBeLessThanOrEqual(768);
	await expect(bar(page).getByRole('link', { name: 'Profil' })).toBeVisible();
});
