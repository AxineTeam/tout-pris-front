import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PasswordChangeForm from './PasswordChangeForm.svelte';

async function fill(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText('Mot de passe actuel'), 'ancien');
	await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau');
	await user.click(screen.getByRole('button', { name: 'Changer mon mot de passe' }));
}

describe('PasswordChangeForm', () => {
	it('exige les deux mots de passe', async () => {
		const user = userEvent.setup();
		render(PasswordChangeForm, { props: { onsubmit: vi.fn() } });

		const submit = screen.getByRole('button', { name: 'Changer mon mot de passe' });
		expect(submit).toBeDisabled();

		await user.type(screen.getByLabelText('Mot de passe actuel'), 'ancien');
		expect(submit).toBeDisabled();
	});

	it('distingue les deux boutons qui dévoilent un mot de passe', () => {
		render(PasswordChangeForm, { props: { onsubmit: vi.fn() } });

		expect(
			screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
		).toEqual(['Afficher le mot de passe actuel', 'Afficher le nouveau mot de passe', null]);
	});

	it('vide les champs et confirme après un changement réussi', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([]);
		render(PasswordChangeForm, { props: { onsubmit } });

		await fill(user);

		expect(onsubmit).toHaveBeenCalledWith('ancien', 'nouveau');
		expect(await screen.findByTestId('password-changed')).toBeInTheDocument();
		expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('');
	});

	it('affiche l’erreur de l’API et garde les champs', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([
			{
				message: 'Please type your current password.',
				code: 'enter_current_password',
				param: 'current_password'
			}
		]);
		render(PasswordChangeForm, { props: { onsubmit } });

		await fill(user);

		expect(await screen.findByText('Please type your current password.')).toBeInTheDocument();
		expect(screen.queryByTestId('password-changed')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('ancien');
	});
});
