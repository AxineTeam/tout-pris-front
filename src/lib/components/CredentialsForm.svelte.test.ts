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

	it('affiche les erreurs renvoyées par l’API', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([
			{
				message: 'The email address and/or password you specified are not correct.',
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

		expect(
			await screen.findByText('The email address and/or password you specified are not correct.')
		).toBeInTheDocument();
	});
});
