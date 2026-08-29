import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CredentialsForm from './CredentialsForm.svelte';

describe('CredentialsForm', () => {
	it('désactive la soumission tant que les deux champs ne sont pas remplis', async () => {
		const user = userEvent.setup();
		render(CredentialsForm, {
			props: {
				submitLabel: 'Se connecter',
				passwordAutocomplete: 'current-password',
				onsubmit: vi.fn()
			}
		});

		const submit = screen.getByRole('button', { name: 'Se connecter' });
		expect(submit).toBeDisabled();

		await user.type(screen.getByLabelText('Adresse email'), 'camille@example.com');
		expect(submit).toBeDisabled();

		await user.type(screen.getByLabelText('Mot de passe'), 'un-mot-de-passe');
		expect(submit).toBeEnabled();
	});

	it('soumet l’adresse débarrassée de ses espaces', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([]);
		render(CredentialsForm, {
			props: { submitLabel: 'Se connecter', passwordAutocomplete: 'current-password', onsubmit }
		});

		await user.type(screen.getByLabelText('Adresse email'), '  camille@example.com  ');
		await user.type(screen.getByLabelText('Mot de passe'), 'un-mot-de-passe');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		expect(onsubmit).toHaveBeenCalledWith('camille@example.com', 'un-mot-de-passe');
	});

	it('annonce au gestionnaire de mots de passe ce qu’attend l’écran', () => {
		render(CredentialsForm, {
			props: {
				submitLabel: 'Créer mon compte',
				passwordAutocomplete: 'new-password',
				onsubmit: vi.fn()
			}
		});

		expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocomplete', 'new-password');
	});

	it('demande au clavier les touches d’une adresse, sans majuscule automatique', () => {
		render(CredentialsForm, {
			props: {
				submitLabel: 'Se connecter',
				passwordAutocomplete: 'current-password',
				onsubmit: vi.fn()
			}
		});

		const email = screen.getByLabelText('Adresse email');
		expect(email).toHaveAttribute('type', 'email');
		expect(email).toHaveAttribute('inputmode', 'email');
		expect(email).toHaveAttribute('autocapitalize', 'none');
		expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocapitalize', 'none');
	});

	it('accroche l’erreur au champ qu’elle vise sans vider la saisie', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([
			{
				message: 'L’adresse e-mail ou le mot de passe sont incorrects.',
				code: 'email_password_mismatch',
				param: 'password'
			}
		]);
		render(CredentialsForm, {
			props: { submitLabel: 'Se connecter', passwordAutocomplete: 'current-password', onsubmit }
		});

		await user.type(screen.getByLabelText('Adresse email'), 'camille@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'faux');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		const password = screen.getByLabelText('Mot de passe');
		expect(
			await screen.findByText('L’adresse e-mail ou le mot de passe sont incorrects.')
		).toBeInTheDocument();
		expect(password).toHaveAttribute('aria-invalid', 'true');
		expect(password).toHaveAttribute('aria-describedby', 'password-errors');
		expect(screen.getByLabelText('Adresse email')).toHaveValue('camille@example.com');
		expect(password).toHaveValue('faux');
	});

	it('remonte au-dessus du bouton ce que l’API n’a rattaché à aucun champ', async () => {
		const user = userEvent.setup();
		const onsubmit = vi
			.fn()
			.mockResolvedValue([{ message: 'Trop de tentatives.', code: 'rate_limited' }]);
		render(CredentialsForm, {
			props: { submitLabel: 'Se connecter', passwordAutocomplete: 'current-password', onsubmit }
		});

		await user.type(screen.getByLabelText('Adresse email'), 'camille@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'faux');
		await user.click(screen.getByRole('button', { name: 'Se connecter' }));

		expect(await screen.findByText('Trop de tentatives.')).toBeInTheDocument();
		expect(screen.getByLabelText('Mot de passe')).not.toHaveAttribute('aria-invalid', 'true');
	});

	it('se verrouille le temps de la requête pour qu’un second appui ne renvoie rien', async () => {
		const user = userEvent.setup();
		let answer: (errors: never[]) => void = () => {};
		const onsubmit = vi.fn().mockReturnValue(new Promise((resolve) => (answer = resolve)));
		render(CredentialsForm, {
			props: { submitLabel: 'Se connecter', passwordAutocomplete: 'current-password', onsubmit }
		});

		await user.type(screen.getByLabelText('Adresse email'), 'camille@example.com');
		await user.type(screen.getByLabelText('Mot de passe'), 'un-mot-de-passe');

		const submit = screen.getByRole('button', { name: 'Se connecter' });
		await user.click(submit);

		expect(submit).toBeDisabled();
		expect(submit).toHaveAttribute('aria-busy', 'true');

		answer([]);
		await vi.waitFor(() => expect(submit).toBeEnabled());
		expect(onsubmit).toHaveBeenCalledTimes(1);
	});
});
