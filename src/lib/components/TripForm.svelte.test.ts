import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TripForm from './TripForm.svelte';
import { goto } from '$app/navigation';
import {
	ApiError,
	addParticipant,
	createTrip,
	embarkKit,
	removeParticipant,
	updateTrip,
	type Kit,
	type Person,
	type TripDetail
} from '$lib/api.js';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	createTrip: vi.fn(),
	updateTrip: vi.fn(),
	addParticipant: vi.fn(),
	removeParticipant: vi.fn(),
	embarkKit: vi.fn()
}));

const lea: Person = { id: 11, name: 'Léa', user: null };
const tom: Person = { id: 12, name: 'Tom', user: null };
const persons = [lea, tom];

const toilette: Kit = { id: 21, name: 'Trousse de toilette', description: '', position: 0 };
const plongee: Kit = { id: 22, name: 'Matériel de plongée', description: '', position: 1 };
const kits = [toilette, plongee];

const corse: TripDetail = {
	id: 5,
	name: 'Corse',
	date: '2026-08-12',
	archived_at: null,
	participants: [{ id: 91, person: lea }],
	items: []
};

function show(trip?: TripDetail) {
	render(TripForm, { props: { household: 7, persons, kits, trip } });
}

async function name(user: UserEvent, wanted: string) {
	await user.clear(screen.getByLabelText('Nom du voyage'));
	await user.type(screen.getByLabelText('Nom du voyage'), wanted);
	await fireEvent.input(screen.getByLabelText('Date de départ'), {
		target: { value: '2026-08-12' }
	});
}

describe('TripForm', () => {
	beforeEach(() => {
		vi.mocked(createTrip).mockResolvedValue(corse);
		vi.mocked(updateTrip).mockResolvedValue(corse);
		vi.mocked(addParticipant).mockResolvedValue({ id: 92, person: tom });
		vi.mocked(removeParticipant).mockResolvedValue(undefined);
		vi.mocked(embarkKit).mockResolvedValue([]);
	});

	it('crée le voyage, ses participants et ses kits en un seul appel', async () => {
		const user = userEvent.setup();
		show();

		await name(user, 'Corse');
		await user.click(screen.getByRole('button', { name: 'Fait partir Léa' }));
		await user.click(screen.getByRole('button', { name: 'Fait partir Tom' }));
		await user.click(screen.getByRole('button', { name: 'Embarquer Trousse de toilette' }));
		await user.click(screen.getByRole('button', { name: 'Créer' }));

		expect(createTrip).toHaveBeenCalledWith(7, {
			name: 'Corse',
			date: '2026-08-12',
			participants: [11, 12],
			kits: [21]
		});
		expect(goto).toHaveBeenCalledWith('/households/7/trips/5');
	});

	it('porte la consigne de majuscule sur le champ, pas sur un ancêtre', () => {
		show();

		expect(screen.getByLabelText('Nom du voyage')).toHaveAttribute('autocapitalize', 'sentences');
	});

	it('part de qui participe déjà quand il modifie', () => {
		show(corse);

		expect(screen.getByRole('button', { name: 'Fait partir Léa' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByRole('button', { name: 'Fait partir Tom' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('ajoute les participants avant d’embarquer un kit', async () => {
		const user = userEvent.setup();
		show(corse);

		await user.click(screen.getByRole('button', { name: 'Fait partir Tom' }));
		await user.click(screen.getByRole('button', { name: 'Embarquer Matériel de plongée' }));
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(addParticipant).toHaveBeenCalledWith(7, 5, 12);
		expect(embarkKit).toHaveBeenCalledWith(7, 5, 22);
		expect(vi.mocked(addParticipant).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(embarkKit).mock.invocationCallOrder[0]
		);
	});

	it('retire celui qu’on décoche', async () => {
		const user = userEvent.setup();
		show(corse);

		await user.click(screen.getByRole('button', { name: 'Fait partir Léa' }));
		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(removeParticipant).toHaveBeenCalledWith(7, 5, 91);
	});

	it('n’embarque rien tant qu’aucun kit n’est coché', async () => {
		const user = userEvent.setup();
		show(corse);

		await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

		expect(embarkKit).not.toHaveBeenCalled();
	});

	it('refuse d’enregistrer un voyage dont la date a été effacée', async () => {
		const user = userEvent.setup();
		show();

		await name(user, 'Corse');
		await fireEvent.input(screen.getByLabelText('Date de départ'), { target: { value: '' } });

		expect(screen.getByRole('button', { name: 'Créer' })).toBeDisabled();
	});

	it('montre sur le champ ce que l’API reproche au nom', async () => {
		const user = userEvent.setup();
		vi.mocked(createTrip).mockRejectedValue(new ApiError(400, { name: ['Déjà pris.'] }, 'refus'));
		show();

		await name(user, 'Corse');
		await user.click(screen.getByRole('button', { name: 'Créer' }));

		expect(await screen.findByText('Déjà pris.')).toBeVisible();
		expect(screen.getByLabelText('Nom du voyage')).toHaveAttribute('aria-invalid', 'true');
	});
});
