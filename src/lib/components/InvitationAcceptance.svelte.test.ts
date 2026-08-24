import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationAcceptance from './InvitationAcceptance.svelte';
import { goto } from '$app/navigation';
import { ApiError, acceptInvitation } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	acceptInvitation: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const me = { id: 1, display: 'camille', email: 'camille@example.com', has_usable_password: true };
const joined = { id: 9, name: 'Famille Martin', personal: false };

describe('InvitationAcceptance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		session.user = null;
		households.all = [];
	});

	it('offre les deux chemins à qui n’est pas connecté, sans deviner lequel', () => {
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(screen.getByTestId('invitation-anonymous')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
			'href',
			'/account/login?next=%2Finvitations%2Fabc'
		);
		expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
			'href',
			'/account/signup'
		);
	});

	it('dit avec quel compte on s’apprête à rejoindre', () => {
		session.user = me;
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(screen.getByTestId('invitation-account')).toHaveTextContent('camille@example.com');
	});

	it('rejoint le foyer et y emmène', async () => {
		const user = userEvent.setup();
		session.user = me;
		vi.mocked(acceptInvitation).mockResolvedValue(joined);
		render(InvitationAcceptance, { props: { token: 'abc' } });

		await user.click(screen.getByRole('button', { name: 'Rejoindre ce foyer' }));

		expect(acceptInvitation).toHaveBeenCalledWith('abc');
		expect(goto).toHaveBeenCalledWith('/households/9');
	});

	it('ne distingue pas un lien inconnu d’un lien expiré ou déjà servi', async () => {
		const user = userEvent.setup();
		session.user = me;
		vi.mocked(acceptInvitation).mockRejectedValue(
			new ApiError(404, { detail: 'Not found.' }, 'not found')
		);
		render(InvitationAcceptance, { props: { token: 'abc' } });

		await user.click(screen.getByRole('button', { name: 'Rejoindre ce foyer' }));

		expect(await screen.findByTestId('invitation-dead')).toBeInTheDocument();
		expect(screen.queryByText('Not found.')).not.toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});
});
