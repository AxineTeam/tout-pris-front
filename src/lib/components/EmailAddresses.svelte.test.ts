import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailAddresses from './EmailAddresses.svelte';
import {
	addEmail,
	listEmails,
	removeEmail,
	resendEmailVerification,
	type AuthResponse,
	type EmailAddress
} from '$lib/api.js';

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

	it('n’offre pas de rendre principale une adresse non vérifiée', async () => {
		render(EmailAddresses);

		const items = await screen.findAllByRole('listitem');
		expect(
			within(items[1]).queryByRole('button', { name: 'Rendre principale' })
		).not.toBeInTheDocument();
		expect(within(items[1]).getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
	});

	it('offre de rendre principale une adresse vérifiée qui ne l’est pas', async () => {
		vi.mocked(listEmails).mockResolvedValue({
			status: 200,
			data: [primary, { email: 'camille+pro@example.com', verified: true, primary: false }]
		});
		render(EmailAddresses);

		const items = await screen.findAllByRole('listitem');
		expect(within(items[1]).getByRole('button', { name: 'Rendre principale' })).toBeInTheDocument();
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

	it('laisse le bouton d’ajout au repos pendant une action de ligne', async () => {
		const user = userEvent.setup();
		let answer!: (response: AuthResponse<EmailAddress[]>) => void;
		vi.mocked(resendEmailVerification).mockReturnValue(
			new Promise((resolve) => (answer = resolve))
		);
		render(EmailAddresses);
		await screen.findAllByRole('listitem');

		const resend = screen.getByRole('button', { name: 'Renvoyer la vérification' });
		await user.click(resend);

		expect(screen.getByRole('button', { name: 'Ajouter' })).toHaveAttribute('aria-busy', 'false');
		expect(resend).toBeDisabled();

		answer({ status: 200, data: [primary] });
	});

	it('ne supprime une adresse qu’une fois la suppression confirmée', async () => {
		const user = userEvent.setup();
		vi.mocked(removeEmail).mockResolvedValue({ status: 200, data: [primary] });
		render(EmailAddresses);
		const items = await screen.findAllByRole('listitem');

		await user.click(within(items[1]).getByRole('button', { name: 'Supprimer' }));

		const modal = await screen.findByRole('dialog');
		expect(modal).toHaveTextContent(pending.email);
		expect(removeEmail).not.toHaveBeenCalled();

		await user.click(within(modal).getByRole('button', { name: 'Supprimer' }));

		expect(removeEmail).toHaveBeenCalledWith(pending.email);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('laisse la boîte ouverte sur le refus de l’API', async () => {
		const user = userEvent.setup();
		vi.mocked(removeEmail).mockResolvedValue({ status: 403 });
		render(EmailAddresses);
		const items = await screen.findAllByRole('listitem');

		await user.click(within(items[1]).getByRole('button', { name: 'Supprimer' }));
		const modal = await screen.findByRole('dialog');
		await user.click(within(modal).getByRole('button', { name: 'Supprimer' }));

		expect(await within(modal).findByText('L’API a refusé la demande.')).toBeInTheDocument();
	});

	it('explique un refus sans corps d’erreur', async () => {
		const user = userEvent.setup();
		vi.mocked(resendEmailVerification).mockResolvedValue({ status: 403 });
		render(EmailAddresses);
		await screen.findAllByRole('listitem');

		await user.click(screen.getByRole('button', { name: 'Renvoyer la vérification' }));

		expect(await screen.findByText('L’API a refusé la demande.')).toBeInTheDocument();
	});
});
