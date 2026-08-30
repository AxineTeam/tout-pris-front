import { expect, test } from '@playwright/test';
import { signInShared } from './account';
import { createShared, deleteShared, name, sheet } from './households';

async function addStatus(page: import('@playwright/test').Page, group: string, wanted: string) {
	await page
		.getByTestId(`status-group-${group}`)
		.getByRole('button', { name: 'Ajouter un statut' })
		.click();
	await sheet(page).getByLabel('Nom du statut').fill(wanted);
	await sheet(page).getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId(`status-group-${group}`)).toContainText(wanted);
}

test('composer les statuts du foyer, désigner celui par défaut, et retirer un autre', async ({
	page
}) => {
	await signInShared(page);
	const shared = await createShared(page, name('statuts'));

	await page.getByTestId('statuses').click();
	await expect(page.getByTestId('screen-title')).toHaveText('Statuts');
	await expect(page.getByTestId('subtitle')).toHaveText(shared.name);

	await addStatus(page, 'not_started', 'Pas préparé');
	const first = page.getByTestId('status-group-not_started').getByRole('listitem').first();
	await expect(first).toContainText('par défaut');
	await expect(first.getByRole('button', { name: 'Supprimer Pas préparé' })).toHaveCount(0);

	await addStatus(page, 'in_progress', 'En machine');
	await expect(page.getByRole('button', { name: 'Supprimer En machine' })).toBeVisible();

	await page.getByRole('button', { name: 'Modifier En machine' }).click();
	await sheet(page).getByRole('button', { name: 'Utiliser par défaut' }).click();
	await expect(
		page.getByTestId('status-group-in_progress').getByRole('listitem').first()
	).toContainText('par défaut');
	await expect(first).not.toContainText('par défaut');

	await page.getByRole('button', { name: 'Modifier Pas préparé' }).click();
	await sheet(page).getByRole('button', { name: 'Utiliser par défaut' }).click();
	await expect(first).toContainText('par défaut');

	await page.getByRole('button', { name: 'Modifier En machine' }).click();
	await sheet(page).getByLabel('Nom du statut').fill('Sur la table');
	await sheet(page).getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByTestId('status-group-in_progress')).toContainText('Sur la table');

	await page.getByRole('button', { name: 'Supprimer Sur la table' }).click();
	await expect(sheet(page).getByTestId('status-fallout')).toContainText(
		'passent à un autre statut de la même section'
	);
	await sheet(page).getByRole('button', { name: 'Supprimer' }).click();
	await expect(page.getByTestId('status-group-in_progress')).not.toContainText('Sur la table');

	await deleteShared(page, shared);
});
