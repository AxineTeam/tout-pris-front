import { expect, test, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { createShared, deleteShared, name, sheet } from './households';

// Playwright ne synthétise que des taps : un tirage demande la vraie séquence
// tactile, envoyée par CDP sur un contexte qui se déclare tactile.
async function dragFinger(page: Page, from: number, to: number, x = 180) {
	const input = await page.context().newCDPSession(page);
	const at = (y: number) => ({ touchPoints: [{ x, y }] });
	await input.send('Input.dispatchTouchEvent', { type: 'touchStart', ...at(from) });
	for (let y = from + 20; y <= to; y += 20) {
		await input.send('Input.dispatchTouchEvent', { type: 'touchMove', ...at(y) });
	}
	await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await input.detach();
}

function indicator(page: Page) {
	return page.getByTestId('pull-refresh');
}

async function scrollAway(page: Page) {
	const scrolled = await indicator(page).evaluate((badge) => {
		const scroller = badge.parentElement;
		if (!scroller) return 0;
		scroller.scrollTop = 200;
		return scroller.scrollTop;
	});
	expect(scrolled, 'l’écran doit déborder pour que le test dise quelque chose').toBeGreaterThan(0);
}

test.use({ hasTouch: true, viewport: { width: 390, height: 460 } });

test('un tirage depuis le haut rafraîchit, le dit, puis s’efface', async ({ page }) => {
	await openAsShared(page);
	await expect(page.getByTestId('trips-empty')).toBeVisible();
	await expect(indicator(page)).toBeHidden();

	await dragFinger(page, 120, 320);

	await expect(indicator(page)).toBeVisible();
	await expect(page.getByTestId('pull-status')).toHaveText('Liste à jour.');
	await expect(indicator(page)).toBeHidden();
});

test('un tirage trop court ne rafraîchit rien', async ({ page }) => {
	await openAsShared(page);
	await expect(page.getByTestId('trips-empty')).toBeVisible();

	await dragFinger(page, 120, 160);

	await expect(indicator(page)).toBeHidden();
	await expect(page.getByTestId('pull-status')).toHaveText('');
});

// Le tirage et le glisser-déposer partent du même doigt. Le statut ajouté rend
// sa section réordonnable, et son départ vers la section suivante prouve que le
// glisser a bien eu lieu — sans quoi l'absence d'indicateur ne dirait rien.
test('une ligne saisie garde le doigt pour elle', async ({ page }) => {
	await openAsShared(page);
	const household = await createShared(page, name('tirage'));
	await page.goto(`/households/${household.id}/statuses`);

	const moved = name('tiré');
	await page
		.getByTestId('status-group-not_started')
		.getByRole('button', { name: 'Ajouter un statut' })
		.click();
	await sheet(page).getByLabel('Nom du statut').fill(moved);
	await sheet(page).getByRole('button', { name: 'Ajouter' }).click();
	await expect(page.getByTestId('status-group-not_started')).toContainText(moved);

	const grip = page
		.locator('[data-row]', { hasText: moved })
		.locator('[data-testid^="status-handle-"]');
	const box = await grip.boundingBox();
	if (!box) throw new Error('aucune poignée de statut à saisir');
	await dragFinger(page, box.y + box.height / 2, box.y + 200, box.x + box.width / 2);

	await expect(indicator(page)).toBeHidden();
	await expect(page.getByTestId('pull-status')).toHaveText('');
	await expect(page.getByTestId('status-group-not_started')).not.toContainText(moved);

	await deleteShared(page, household);
});

test('un tirage depuis le milieu d’une liste défilée laisse défiler', async ({ page }) => {
	await openAsShared(page);
	await page.goto('/me');
	await expect(page.getByTestId('account-email')).toBeVisible();
	await scrollAway(page);

	await dragFinger(page, 120, 320);

	await expect(indicator(page)).toBeHidden();
	await expect(page.getByTestId('pull-status')).toHaveText('');
});
