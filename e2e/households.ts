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
	await expect(page.getByTestId('household-name')).toHaveText(wanted);
	return { id: Number(new URL(page.url()).pathname.split('/').pop()), name: wanted };
}

export async function deleteShared(page: Page, household: SharedHousehold) {
	await page.goto(`/households/${household.id}`);
	await page.getByRole('button', { name: 'Supprimer ce foyer' }).click();
	await expect(page.getByRole('link', { name: household.name })).toHaveCount(0);
}
