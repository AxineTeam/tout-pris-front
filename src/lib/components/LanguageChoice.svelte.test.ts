import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageChoice from './LanguageChoice.svelte';
import * as api from '$lib/api.js';
import { ApiError } from '$lib/api.js';
import { session } from '$lib/session.svelte.js';

// La configuration des tests importe `locale.svelte.js`, donc la session, avant
// que `vi.mock` ne soit posé : le module gardé en cache appellerait le vrai
// `updateMe`. Un espion sur le module que la session lit atteint les deux.
const updateMe = vi.spyOn(api, 'updateMe');

const camille = {
	id: 1,
	display: 'camille',
	email: 'camille@example.com',
	has_usable_password: true,
	language: 'fr'
};

const trigger = () => screen.getByRole('button');

// La liste flotte : jsdom ne mesure rien, donc bits-ui la laisse en
// `visibility: hidden`, Testing Library la tient pour inaccessible et le nom
// des options y est vide. Elle ne s'ouvre pas non plus au clic, faute de vrai
// pointeur, mais le clavier la déplie et les options répondent ensuite au clic.
async function options() {
	return screen.findAllByRole('option', { hidden: true });
}

async function pick(user: ReturnType<typeof userEvent.setup>, name: string) {
	trigger().focus();
	await user.keyboard('{ArrowDown}');
	const chosen = (await options()).find((option) => option.textContent?.trim() === name);
	await user.click(chosen!);
}

describe('LanguageChoice', () => {
	beforeEach(() => {
		session.user = { ...camille };
		updateMe.mockResolvedValue({ id: 1, email: camille.email, language: 'en-us' });
	});

	it('montre la langue courante du compte, sous le nom du contrôle', () => {
		render(LanguageChoice);

		expect(trigger()).toHaveTextContent('Français');
		expect(trigger()).toHaveAttribute('aria-labelledby', 'language-label language-choice');
		expect(screen.getByText('Choix de la langue')).toHaveAttribute('id', 'language-label');
	});

	it('offre chaque langue écrite dans la sienne', async () => {
		const user = userEvent.setup();
		render(LanguageChoice);
		trigger().focus();

		await user.keyboard('{ArrowDown}');

		expect((await options()).map((option) => option.textContent?.trim())).toEqual([
			'Français',
			'English'
		]);
	});

	it('envoie le code de l’API, pas celui de paraglide', async () => {
		const user = userEvent.setup();
		render(LanguageChoice);

		await pick(user, 'English');

		expect(updateMe).toHaveBeenCalledWith('en-us');
	});

	it('garde ce que la réponse ne porte pas', async () => {
		const user = userEvent.setup();
		render(LanguageChoice);

		await pick(user, 'English');

		expect(session.user).toEqual({ ...camille, language: 'en-us' });
	});

	it('ne demande rien pour la langue déjà parlée', async () => {
		const user = userEvent.setup();
		render(LanguageChoice);

		await pick(user, 'Français');

		expect(updateMe).not.toHaveBeenCalled();
	});

	it('relaie le refus de l’API', async () => {
		updateMe.mockRejectedValue(new ApiError(400, { language: ['Choix invalide.'] }, 'refus'));
		const user = userEvent.setup();
		render(LanguageChoice);

		await pick(user, 'English');

		expect(await screen.findByText('Choix invalide.')).toBeInTheDocument();
		expect(session.user).toEqual(camille);
		expect(trigger()).toHaveTextContent('Français');
	});
});
