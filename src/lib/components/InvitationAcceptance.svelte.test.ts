import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationAcceptance from './InvitationAcceptance.svelte';
import { goto } from '$app/navigation';
import { ApiError, acceptInvitation, readInvitation } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	acceptInvitation: vi.fn(),
	readInvitation: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const me = { id: 1, display: 'camille', email: 'camille@example.com', has_usable_password: true };
const joined = { id: 9, name: 'Famille Martin', personal: false };
const preview = {
	household: 'Famille Martin',
	inviter: 'Paul',
	expires_at: '2026-09-05T10:00:00Z'
};

const dead = () => new ApiError(404, { detail: 'Not found.' }, 'not found');

describe('InvitationAcceptance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		session.user = null;
		households.all = [];
		vi.mocked(readInvitation).mockResolvedValue(preview);
	});

	it('nomme le foyer et son invitant avant même la connexion', async () => {
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(await screen.findByTestId('invitation-household')).toHaveTextContent(
			'Paul t’invite à rejoindre Famille Martin.'
		);
		expect(readInvitation).toHaveBeenCalledWith('abc');
	});

	it('nomme le foyer même quand le compte qui a invité a disparu', async () => {
		vi.mocked(readInvitation).mockResolvedValue({ ...preview, inviter: null });
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(await screen.findByTestId('invitation-household')).toHaveTextContent(
			'Tu es invité à rejoindre Famille Martin.'
		);
	});

	it('offre les deux chemins à qui n’est pas connecté, sans deviner lequel', async () => {
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(await screen.findByTestId('invitation-anonymous')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
			'href',
			'/account/login?next=%2Finvitations%2Fabc'
		);
		expect(screen.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute(
			'href',
			'/account/signup'
		);
	});

	it('dit avec quel compte on s’apprête à rejoindre', async () => {
		session.user = me;
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(await screen.findByTestId('invitation-account')).toHaveTextContent(
			'camille@example.com'
		);
	});

	it('rejoint le foyer et y emmène', async () => {
		const user = userEvent.setup();
		session.user = me;
		vi.mocked(acceptInvitation).mockResolvedValue(joined);
		render(InvitationAcceptance, { props: { token: 'abc' } });

		await user.click(await screen.findByRole('button', { name: 'Rejoindre ce foyer' }));

		expect(acceptInvitation).toHaveBeenCalledWith('abc');
		expect(goto).toHaveBeenCalledWith('/households/9');
	});

	it('annonce le lien mort au chargement, sans proposer de rejoindre', async () => {
		vi.mocked(readInvitation).mockRejectedValue(dead());
		render(InvitationAcceptance, { props: { token: 'abc' } });

		expect(await screen.findByTestId('invitation-dead')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Rejoindre ce foyer' })).not.toBeInTheDocument();
		expect(screen.queryByText('Not found.')).not.toBeInTheDocument();
	});

	it('ne distingue pas un lien inconnu d’un lien expiré ou déjà servi', async () => {
		const user = userEvent.setup();
		session.user = me;
		vi.mocked(acceptInvitation).mockRejectedValue(dead());
		render(InvitationAcceptance, { props: { token: 'abc' } });

		await user.click(await screen.findByRole('button', { name: 'Rejoindre ce foyer' }));

		expect(await screen.findByTestId('invitation-dead')).toBeInTheDocument();
		expect(screen.queryByText('Not found.')).not.toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});

	it('repart vers la connexion quand on veut un autre compte', async () => {
		const user = userEvent.setup();
		const logOut = vi.spyOn(session, 'logOut').mockResolvedValue(undefined);
		session.user = me;
		households.all = [joined];
		render(InvitationAcceptance, { props: { token: 'abc' } });

		await user.click(await screen.findByRole('button', { name: 'Utiliser un autre compte' }));

		expect(logOut).toHaveBeenCalled();
		expect(households.all).toEqual([]);
		expect(goto).toHaveBeenCalledWith('/account/login?next=%2Finvitations%2Fabc');
	});
});
