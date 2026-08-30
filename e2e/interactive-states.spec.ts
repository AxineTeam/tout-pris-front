import { expect, test, type Page } from '@playwright/test';
import { openAsShared } from './account';
import { addPerson, closeSheet, createShared, deleteShared, name, sheet } from './households';

interface Stop {
	label: string;
	ring: boolean;
}

function background(page: Page, label: string) {
	return page
		.getByRole('button', { name: label })
		.evaluate((surface) => getComputedStyle(surface).backgroundColor);
}

async function foyer(page: Page) {
	await page
		.getByRole('navigation', { name: 'Navigation principale' })
		.getByRole('link', { name: 'Foyer' })
		.click();
}

async function readShadowsAtRest(page: Page) {
	await page.evaluate(() => {
		for (const element of document.querySelectorAll('*')) {
			element.setAttribute('data-shadow-at-rest', getComputedStyle(element).boxShadow);
		}
	});
}

async function stopped(page: Page): Promise<Stop | null> {
	return page.evaluate(async () => {
		const reached = document.activeElement;
		if (!reached || reached === document.body) return null;
		await Promise.all(
			reached
				.getAnimations()
				.filter((animation) => animation instanceof CSSTransition)
				.map((animation) => animation.finished)
		);
		const style = getComputedStyle(reached);
		return {
			label:
				reached.getAttribute('aria-label') ??
				reached.textContent?.trim().slice(0, 40) ??
				reached.tagName,
			ring:
				reached.hasAttribute('data-shadow-at-rest') &&
				style.boxShadow !== reached.getAttribute('data-shadow-at-rest')
		};
	});
}

test('la souris allume ce qui se clique, le clavier montre où il est', async ({ page }) => {
	await openAsShared(page);
	const household = await createShared(page, name('etats'));
	try {
		await foyer(page);
		await addPerson(page, 'Camille');

		const card = 'Ajouter une personne';
		const resting = await background(page, card);
		await page.getByRole('button', { name: card }).hover();
		await expect
			.poll(() => background(page, card), { message: 'la carte reste éteinte au survol' })
			.not.toBe(resting);

		await page.getByTestId('screen-title').click();
		await readShadowsAtRest(page);

		const stops: Stop[] = [];
		for (let press = 0; press < 30 && stops.at(-1)?.label !== 'Profil'; press++) {
			await page.keyboard.press('Tab');
			const stop = await stopped(page);
			if (stop) stops.push(stop);
		}

		expect(stops.map((stop) => stop.label)).toEqual(
			expect.arrayContaining([
				'Changer de foyer',
				'Actions sur Camille',
				'Ajouter une personne',
				'Renommer le foyer',
				'Profil'
			])
		);
		expect(stops.filter((stop) => !stop.ring)).toEqual([]);
	} finally {
		await deleteShared(page, household);
	}
});

test('chaque pop-up à champ texte s’ouvre sur son champ', async ({ page }) => {
	await openAsShared(page);
	const household = await createShared(page, name('focus'));
	try {
		await foyer(page);

		for (const [opens, field] of [
			['Ajouter une personne', 'Nom de la personne'],
			['Envoyer une invitation', 'Inviter une adresse'],
			['Renommer le foyer', 'Nom du foyer']
		]) {
			await page.getByRole('button', { name: opens }).click();
			await expect(sheet(page).getByLabel(field)).toBeFocused();
			await closeSheet(page);
		}
	} finally {
		await deleteShared(page, household);
	}
});
