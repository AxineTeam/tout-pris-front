import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdInvitations from './HouseholdInvitations.svelte';
import { ApiError, cancelInvitation, sendInvitation, type Invitation } from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	sendInvitation: vi.fn(),
	cancelInvitation: vi.fn()
}));

const pending: Invitation = {
	id: 5,
	email: 'dominique@example.com',
	created_at: '2026-08-20T10:00:00Z',
	expires_at: '2026-08-27T10:00:00Z'
};

function mount(invitations = [pending], canInvite = true, onchanged = vi.fn()) {
	render(HouseholdInvitations, {
		props: { household: 7, invitations, canInvite, onchanged }
	});
	return onchanged;
}

describe('HouseholdInvitations', () => {
	beforeEach(() => vi.clearAllMocks());

	it('date l’invitation en attente', () => {
		mount();

		expect(screen.getByText(/envoyée le 20 août 2026, expire le 27 août 2026/)).toBeInTheDocument();
	});

	it('ne promet pas d’avoir envoyé quoi que ce soit', async () => {
		const user = userEvent.setup();
		vi.mocked(sendInvitation).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.type(screen.getByLabelText('Inviter une adresse'), 'sacha@example.com');
		await user.click(screen.getByRole('button', { name: 'Inviter' }));

		expect(sendInvitation).toHaveBeenCalledWith(7, 'sacha@example.com');
		expect(await screen.findByTestId('invitation-sent')).toHaveTextContent(
			'Si cette adresse peut être invitée, elle recevra un lien.'
		);
		expect(onchanged).toHaveBeenCalled();
	});

	it('relaie la limite quotidienne de l’API plutôt que d’annoncer une panne', async () => {
		const user = userEvent.setup();
		vi.mocked(sendInvitation).mockRejectedValue(
			new ApiError(
				429,
				{ detail: 'Request was throttled. Expected available in 86400 seconds.' },
				'too many'
			)
		);
		mount();

		await user.type(screen.getByLabelText('Inviter une adresse'), 'sacha@example.com');
		await user.click(screen.getByRole('button', { name: 'Inviter' }));

		expect(
			await screen.findByText('Request was throttled. Expected available in 86400 seconds.')
		).toBeInTheDocument();
		expect(screen.queryByTestId('invitation-sent')).not.toBeInTheDocument();
		expect(screen.queryByText('L’API est injoignable.')).not.toBeInTheDocument();
	});

	it('annule une invitation', async () => {
		const user = userEvent.setup();
		vi.mocked(cancelInvitation).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.click(
			screen.getByRole('button', { name: 'Annuler l’invitation de dominique@example.com' })
		);

		expect(cancelInvitation).toHaveBeenCalledWith(7, 5);
		expect(onchanged).toHaveBeenCalled();
	});

	it('montre la liste à un membre sans lui offrir ce que l’API refusera', () => {
		mount([pending], false);

		expect(screen.getByText('dominique@example.com')).toBeInTheDocument();
		expect(screen.queryByLabelText('Inviter une adresse')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Annuler l’invitation de dominique@example.com' })
		).not.toBeInTheDocument();
	});

	it('dit qu’il n’y a rien en attente', () => {
		mount([]);

		expect(screen.getByTestId('no-invitation')).toBeInTheDocument();
	});
});
