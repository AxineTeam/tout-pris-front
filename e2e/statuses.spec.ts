import { expect, test, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { createShared, deleteShared, name, sheet } from './households';

async function addStatus(page: Page, group: string, wanted: string) {
	await page
		.getByTestId(`status-group-${group}`)
		.getByRole('button', { name: 'Ajouter un statut' })
		.click();
	await sheet(page).getByLabel('Nom du statut').fill(wanted);
	await sheet(page).getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId(`status-group-${group}`)).toContainText(wanted);
}

function firstOf(page: Page, group: string) {
	return page.getByTestId(`status-group-${group}`).getByRole('listitem').first();
}

async function dragToEndOf(page: Page, wanted: string, group: string) {
	const handle = page
		.locator('[data-row]', { hasText: wanted })
		.locator('[data-testid^="status-handle-"]');
	const grip = await handle.boundingBox();
	const section = await page.getByTestId(`status-group-${group}`).boundingBox();
	if (!grip || !section) throw new Error(`nothing to drag from ${wanted} to ${group}`);
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
	await page.mouse.down();
	await page.mouse.move(section.x + section.width / 2, section.y + section.height - 8, {
		steps: 12
	});
	await page.mouse.up();
}

function paintOf(page: Page, group: string) {
	return firstOf(page, group)
		.locator('span[style]')
		.evaluate((swatch) => getComputedStyle(swatch).backgroundColor);
}

test('un foyer neuf porte ses trois statuts, qu’on complète, redésigne et retire', async ({
	page
}) => {
	await openAsShared(page);
	const shared = await createShared(page, name('statuts'));

	await page.getByTestId('statuses').click();
	await expect(page.getByTestId('screen-title')).toHaveText('Statuts');
	await expect(page.getByTestId('subtitle')).toHaveText(shared.name);

	await expect(firstOf(page, 'not_started')).toContainText('Pas préparé');
	await expect(firstOf(page, 'in_progress')).toContainText('Sorti du placard');
	await expect(firstOf(page, 'done')).toContainText('Dans les sacs');
	await expect(page.getByTestId('status-group-not_started').getByRole('listitem')).toHaveCount(2);

	expect(await paintOf(page, 'not_started')).toBe('rgb(123, 129, 137)');
	expect(await paintOf(page, 'in_progress')).toBe('rgb(220, 177, 79)');
	expect(await paintOf(page, 'done')).toBe('rgb(92, 138, 102)');

	await expect(firstOf(page, 'not_started')).toContainText('par défaut');
	await expect(firstOf(page, 'not_started').getByRole('button', { name: 'Supprimer' })).toHaveCount(
		0
	);
	await expect(firstOf(page, 'in_progress')).not.toContainText('par défaut');

	await addStatus(page, 'in_progress', 'En machine');
	await expect(page.getByRole('button', { name: 'Supprimer En machine' })).toBeVisible();

	await page.getByRole('button', { name: 'Modifier En machine' }).click();
	await sheet(page).getByRole('button', { name: 'Utiliser par défaut' }).click();
	await expect(page.getByTestId('status-group-in_progress')).toContainText('par défaut');
	await expect(firstOf(page, 'not_started')).not.toContainText('par défaut');

	await page.getByRole('button', { name: 'Modifier Pas préparé' }).click();
	await sheet(page).getByRole('button', { name: 'Utiliser par défaut' }).click();
	await expect(firstOf(page, 'not_started')).toContainText('par défaut');

	await page.getByRole('button', { name: 'Modifier En machine' }).click();
	await sheet(page).getByLabel('Nom du statut').fill('Sur la table');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('status-group-in_progress')).toContainText('Sur la table');

	await expect(page.locator('[data-testid^="status-handle-"]').first()).toHaveCSS(
		'touch-action',
		'none'
	);

	await dragToEndOf(page, 'Sur la table', 'done');
	await expect(page.getByTestId('status-group-done')).toContainText('Sur la table');
	await expect(page.getByTestId('status-group-in_progress')).not.toContainText('Sur la table');

	await page.reload();
	await expect(page.getByTestId('status-group-done')).toContainText('Sur la table');
	await expect(page.getByTestId('status-group-in_progress')).not.toContainText('Sur la table');
	await expect(page.getByTestId('status-group-done').getByRole('listitem').nth(1)).toContainText(
		'Sur la table'
	);

	await page.getByRole('button', { name: 'Supprimer Sur la table' }).click();
	await expect(sheet(page).getByTestId('status-fallout')).toContainText(
		'passent à un autre statut de la même section'
	);
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(page.getByTestId('status-group-done')).not.toContainText('Sur la table');

	await deleteShared(page, shared);
});
