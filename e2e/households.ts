import { expect, type Page } from '@playwright/test';

export interface SharedHousehold {
	id: number;
	name: string;
}

export function name(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function openPersonal(page: Page) {
	await page.goto('/');
	await page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Foyer' })
		.click();
}

export async function createShared(page: Page, wanted: string): Promise<SharedHousehold> {
	await page.goto('/');
	await page.getByRole('button', { name: 'Nouveau foyer' }).click();
	await page.getByLabel('Nom du nouveau foyer').fill(wanted);
	await page.getByRole('button', { name: 'Créer' }).click();
	await expect(page.getByTestId('screen-title')).toHaveText(wanted);
	return { id: Number(new URL(page.url()).pathname.split('/').pop()), name: wanted };
}

export async function addPerson(page: Page, wanted: string) {
	await page.getByRole('button', { name: 'Ajouter une personne' }).click();
	await sheet(page).getByLabel('Nom de la personne').fill(wanted);
	await sheet(page).getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId('persons')).toContainText(wanted);
}

export function sheet(page: Page) {
	return page.getByRole('dialog');
}

export function personRow(page: Page, holds: string) {
	return page.getByTestId('persons').getByRole('listitem').filter({ hasText: holds });
}

export async function openPerson(page: Page, holds: string) {
	await personRow(page, holds).getByRole('button').click();
	await expect(sheet(page)).toBeVisible();
}

export async function closeSheet(page: Page) {
	await sheet(page).getByRole('button', { name: 'Fermer' }).click();
	await expect(sheet(page)).toHaveCount(0);
}

export async function deleteShared(page: Page, household: SharedHousehold) {
	await page.goto(`/households/${household.id}`);
	await page.getByRole('button', { name: 'Supprimer ce foyer' }).click();
	await sheet(page).getByRole('button', { name: 'Supprimer ce foyer' }).click();
	await expect(page.getByRole('link', { name: household.name })).toHaveCount(0);
}
