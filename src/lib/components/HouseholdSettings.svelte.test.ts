import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HouseholdSettings from './HouseholdSettings.svelte';
import { deleteHousehold, renameHousehold, type ItemStatus } from '$lib/api.js';
import { householdsQuery, queryClient } from '$lib/query.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	renameHousehold: vi.fn(),
	deleteHousehold: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const household = { id: 7, name: 'Famille Martin', personal: false };

const statuses: ItemStatus[] = [
	{
		id: 1,
		name: 'Pas préparé',
		color: '#7b8189',
		progress: 'not_started',
		position: 0,
		is_default: true
	}
];

function mount(owner = true, onchanged = vi.fn()) {
	render(HouseholdSettings, { props: { household, statuses, owner, onchanged } });
	return onchanged;
}

async function sheet() {
	const opened = await screen.findByRole('dialog');
	await waitFor(() => expect(opened.contains(document.activeElement)).toBe(true));
	return opened;
}

describe('HouseholdSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		queryClient.clear();
		queryClient.setQueryData(householdsQuery().queryKey, [household]);
	});

	it('mène aux statuts du foyer', () => {
		mount();

		expect(screen.getByTestId('statuses')).toHaveAttribute('href', '/households/7/statuses');
	});

	it('réserve le renommage et la suppression aux propriétaires', () => {
		mount(false);

		expect(screen.getByTestId('statuses')).toBeVisible();
		expect(screen.queryByRole('button', { name: 'Renommer le foyer' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Supprimer ce foyer' })).toBeNull();
	});

	it('renomme le foyer et met le sélecteur à jour', async () => {
		const user = userEvent.setup();
		vi.mocked(renameHousehold).mockResolvedValue({ ...household, name: 'Chez nous' });
		const onchanged = mount();

		await user.click(screen.getByRole('button', { name: 'Renommer le foyer' }));
		const name = within(await sheet()).getByLabelText('Nom du foyer');
		await user.clear(name);
		await user.type(name, 'Chez nous');
		await user.click(within(await sheet()).getByRole('button', { name: 'Renommer' }));

		expect(renameHousehold).toHaveBeenCalledWith(7, 'Chez nous');
		await waitFor(() =>
			expect(queryClient.getQueryData(householdsQuery().queryKey)?.[0].name).toBe('Chez nous')
		);
		expect(onchanged).toHaveBeenCalled();
	});

	it('demande confirmation avant de supprimer le foyer', async () => {
		const user = userEvent.setup();
		vi.mocked(deleteHousehold).mockResolvedValue(undefined);
		mount();

		await user.click(screen.getByRole('button', { name: 'Supprimer ce foyer' }));

		expect(within(await sheet()).getByText(/C’est définitif/)).toBeVisible();
		expect(deleteHousehold).not.toHaveBeenCalled();

		await user.click(within(await sheet()).getByRole('button', { name: 'Supprimer ce foyer' }));

		expect(deleteHousehold).toHaveBeenCalledWith(7);
	});
});
