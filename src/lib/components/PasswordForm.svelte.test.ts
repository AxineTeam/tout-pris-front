import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PasswordForm from './PasswordForm.svelte';

describe('PasswordForm', () => {
	it('n’envoie rien tant que le champ est vide', () => {
		render(PasswordForm, { props: { submitLabel: 'Changer', onsubmit: vi.fn() } });

		expect(screen.getByRole('button', { name: 'Changer' })).toBeDisabled();
	});

	it('transmet le mot de passe tel quel', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([]);
		render(PasswordForm, { props: { submitLabel: 'Changer', onsubmit } });

		await user.type(screen.getByLabelText('Nouveau mot de passe'), '  espaces  ');
		await user.click(screen.getByRole('button', { name: 'Changer' }));

		expect(onsubmit).toHaveBeenCalledWith('  espaces  ');
	});

	it('affiche une erreur quand le backend est injoignable', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockRejectedValue(new Error('offline'));
		render(PasswordForm, { props: { submitLabel: 'Changer', onsubmit } });

		await user.type(screen.getByLabelText('Nouveau mot de passe'), 'peu importe');
		await user.click(screen.getByRole('button', { name: 'Changer' }));

		expect(await screen.findByText('Le backend est injoignable.')).toBeInTheDocument();
	});
});
