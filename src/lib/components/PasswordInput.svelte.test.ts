import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordInput from './PasswordInput.svelte';

function renderInput(describes = 'le mot de passe') {
	render(PasswordInput, {
		props: { id: 'password', autocomplete: 'current-password', describes, value: 'secret' }
	});
	return document.querySelector('#password') as HTMLInputElement;
}

describe('PasswordInput', () => {
	it('masque le mot de passe tant que l’œil n’est pas cliqué', () => {
		const input = renderInput();

		expect(input).toHaveAttribute('type', 'password');
		expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toBeInTheDocument();
	});

	it('affiche puis remasque le mot de passe', async () => {
		const user = userEvent.setup();
		const input = renderInput();

		await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));

		expect(input).toHaveAttribute('type', 'text');
		expect(input).toHaveValue('secret');

		await user.click(screen.getByRole('button', { name: 'Masquer le mot de passe' }));

		expect(input).toHaveAttribute('type', 'password');
	});

	it('reste hors de la capitalisation une fois dévoilé', async () => {
		const user = userEvent.setup();
		const input = renderInput();

		await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }));

		expect(input).toHaveAttribute('type', 'text');
		expect(input).toHaveAttribute('autocapitalize', 'none');
	});

	it('nomme le champ qu’il dévoile', async () => {
		const user = userEvent.setup();
		renderInput('le mot de passe actuel');

		const reveal = screen.getByRole('button', { name: 'Afficher le mot de passe actuel' });
		await user.click(reveal);

		expect(
			screen.getByRole('button', { name: 'Masquer le mot de passe actuel' })
		).toBeInTheDocument();
	});

	it('laisse le champ annoncer son état plutôt que de le dupliquer', async () => {
		const user = userEvent.setup();
		renderInput();

		const reveal = screen.getByRole('button', { name: 'Afficher le mot de passe' });
		expect(reveal).not.toHaveAttribute('aria-pressed');

		await user.click(reveal);

		expect(screen.getByRole('button', { name: 'Masquer le mot de passe' })).not.toHaveAttribute(
			'aria-pressed'
		);
	});

	it('ne soumet pas le formulaire qui le contient', () => {
		renderInput();

		expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveAttribute(
			'type',
			'button'
		);
	});
});
