import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailAddresses from './EmailAddresses.svelte';
import { addEmail, listEmails, resendEmailVerification } from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	listEmails: vi.fn(),
	addEmail: vi.fn(),
	makeEmailPrimary: vi.fn(),
	removeEmail: vi.fn(),
	resendEmailVerification: vi.fn()
}));

const primary = { email: 'camille@example.com', verified: true, primary: true };
const pending = { email: 'camille+alt@example.com', verified: false, primary: false };

describe('EmailAddresses', () => {
	beforeEach(() => {
		vi.mocked(listEmails).mockResolvedValue({ status: 200, data: [primary, pending] });
	});

	it('distingue l’adresse principale de celle qui attend sa vérification', async () => {
		render(EmailAddresses);

		const items = await screen.findAllByRole('listitem');
		expect(within(items[0]).getByText('principale')).toBeInTheDocument();
		expect(within(items[1]).getByText('non vérifiée')).toBeInTheDocument();
	});

	it('n’offre ni suppression ni bascule sur l’adresse principale', async () => {
		render(EmailAddresses);

		const items = await screen.findAllByRole('listitem');
		expect(within(items[0]).queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
		expect(within(items[1]).getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
	});

	it('vide le champ après un ajout accepté', async () => {
		const user = userEvent.setup();
		vi.mocked(addEmail).mockResolvedValue({ status: 200, data: [primary] });
		render(EmailAddresses);
		await screen.findAllByRole('listitem');

		const field = screen.getByLabelText('Ajouter une adresse');
		await user.type(field, 'camille+autre@example.com');
		await user.click(screen.getByRole('button', { name: 'Ajouter' }));

		expect(addEmail).toHaveBeenCalledWith('camille+autre@example.com');
		expect(field).toHaveValue('');
	});

	it('explique un refus sans corps d’erreur', async () => {
		const user = userEvent.setup();
		vi.mocked(resendEmailVerification).mockResolvedValue({ status: 403 });
		render(EmailAddresses);
		await screen.findAllByRole('listitem');

		await user.click(screen.getByRole('button', { name: 'Renvoyer la vérification' }));

		expect(await screen.findByText('Le backend a refusé la demande.')).toBeInTheDocument();
	});
});
