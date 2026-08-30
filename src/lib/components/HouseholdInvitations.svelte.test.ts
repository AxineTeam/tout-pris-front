import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdInvitations from './HouseholdInvitations.svelte';
import { ApiError, cancelInvitation, sendInvitation, type Invitation } from '$lib/api.js';
import { session } from '$lib/session.svelte.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	sendInvitation: vi.fn(),
	cancelInvitation: vi.fn()
}));

const day = new Intl.DateTimeFormat('fr', { dateStyle: 'long' });
const englishDay = new Intl.DateTimeFormat('en', { dateStyle: 'long' });

function isoInDays(days: number): string {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function on(moment: string): string {
	return day.format(new Date(moment));
}

function onInEnglish(moment: string): string {
	return englishDay.format(new Date(moment));
}

const pending: Invitation = {
	id: 5,
	email: 'dominique@example.com',
	created_at: isoInDays(-6),
	expires_at: isoInDays(1)
};

function mount(invitations = [pending], onchanged = vi.fn()) {
	render(HouseholdInvitations, { props: { household: 7, invitations, onchanged } });
	return onchanged;
}

function sheet() {
	return screen.getByRole('dialog');
}

async function fillInvitation(user: UserEvent, invited: string) {
	await user.click(screen.getByRole('button', { name: 'Envoyer une invitation' }));
	await user.type(within(sheet()).getByLabelText('Inviter une adresse'), invited);
	await user.click(within(sheet()).getByRole('button', { name: 'Inviter' }));
}

describe('HouseholdInvitations', () => {
	beforeEach(() => vi.clearAllMocks());

	afterEach(() => {
		session.user = null;
	});

	it('date l’invitation en attente', () => {
		mount();

		expect(
			screen.getByText(`envoyée le ${on(pending.created_at)}, expire le ${on(pending.expires_at)}`)
		).toBeInTheDocument();
	});

	it('date l’invitation dans la langue du compte', () => {
		session.user = {
			id: 1,
			display: 'Alix',
			email: 'alix@example.com',
			has_usable_password: true,
			language: 'en'
		};

		mount();

		expect(
			screen.getByText(
				`sent on ${onInEnglish(pending.created_at)}, expires on ${onInEnglish(pending.expires_at)}`
			)
		).toBeInTheDocument();
	});

	it('ne promet pas d’avoir envoyé quoi que ce soit', async () => {
		const user = userEvent.setup();
		vi.mocked(sendInvitation).mockResolvedValue(undefined);
		const onchanged = mount();

		await fillInvitation(user, 'sacha@example.com');

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

		await fillInvitation(user, 'sacha@example.com');

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

	it('dit qu’il n’y a rien en attente', () => {
		mount([]);

		expect(screen.getByTestId('no-invitation')).toBeInTheDocument();
	});
});
