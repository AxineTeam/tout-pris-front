import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdClaim from './HouseholdClaim.svelte';
import { ApiError, claimPerson, createPerson, type Member, type Person } from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	claimPerson: vi.fn(),
	createPerson: vi.fn()
}));

const household = { id: 7, name: 'Famille Martin', personal: false };

const camille: Person = { id: 10, name: 'Camille', user: 1 };
const child: Person = { id: 11, name: 'Léo', user: null };

const owner: Member = { id: 100, user: 1, email: 'camille@example.com', role: 'owner' };
const arriving: Member = { id: 101, user: 2, email: 'sacha@example.com', role: 'member' };

function mount(persons: Person[] = [camille, child], onchanged = vi.fn()) {
	render(HouseholdClaim, {
		props: { household, persons, members: [owner, arriving], onchanged }
	});
	return onchanged;
}

describe('HouseholdClaim', () => {
	beforeEach(() => vi.clearAllMocks());

	it('pose la question et dit ce qu’elle coûte de ne pas y répondre', () => {
		mount();

		expect(screen.getByTestId('claim')).toHaveTextContent('Qui es-tu dans ce foyer ?');
		expect(screen.getByTestId('claim')).toHaveTextContent('tu ne peux rien y modifier');
	});

	it('n’offre que les personnes sans compte', () => {
		mount();

		const choices = within(screen.getByTestId('claimable')).getAllByRole('button');
		expect(choices).toHaveLength(1);
		expect(choices[0]).toHaveAccessibleName('Je suis Léo');
	});

	it('se désigne comme une personne existante', async () => {
		const user = userEvent.setup();
		vi.mocked(claimPerson).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Je suis Léo' }));

		expect(claimPerson).toHaveBeenCalledWith(7, 11);
		expect(onchanged).toHaveBeenCalled();
	});

	it('crée sa personne quand aucune ne la représente', async () => {
		const user = userEvent.setup();
		vi.mocked(createPerson).mockResolvedValue({ id: 12, name: 'Sacha', user: null });
		vi.mocked(claimPerson).mockResolvedValue(undefined);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Aucun d’eux, créer ma personne' }));
		const sheet = screen.getByRole('dialog');
		await user.type(within(sheet).getByLabelText('Ton nom dans ce foyer'), 'Sacha');
		await user.click(within(sheet).getByRole('button', { name: 'Créer' }));

		expect(createPerson).toHaveBeenCalledWith(7, 'Sacha');
		expect(claimPerson).toHaveBeenCalledWith(7, 12);
		expect(onchanged).toHaveBeenCalled();
	});

	it('relaie le refus de l’API quand la personne vient d’être prise', async () => {
		const user = userEvent.setup();
		vi.mocked(claimPerson).mockRejectedValue(
			new ApiError(409, { detail: 'That person already has an account.' }, 'conflict')
		);
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Je suis Léo' }));

		expect(await screen.findByText('That person already has an account.')).toBeInTheDocument();
		expect(onchanged).not.toHaveBeenCalled();
	});

	it('montre le reste du foyer sans laisser y toucher', () => {
		mount();

		const rest = screen.getByTestId('claim-rest');
		expect(within(rest).getByText('Camille')).toBeVisible();
		expect(within(rest).getByText('sacha@example.com')).toBeVisible();
		expect(within(rest).queryByRole('button')).toBeNull();
	});
});
