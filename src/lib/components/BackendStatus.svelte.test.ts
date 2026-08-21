import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BackendStatus from './BackendStatus.svelte';
import { ApiError, getHealth } from '$lib/api.js';

vi.mock('$lib/api.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api.js')>()),
	getHealth: vi.fn()
}));

describe('BackendStatus', () => {
	it('affiche le statut renvoyé par le backend', async () => {
		vi.mocked(getHealth).mockResolvedValue({ status: 'ok' });

		render(BackendStatus);

		expect(await screen.findByTestId('backend-status')).toHaveTextContent('ok');
	});

	it('signale un backend injoignable', async () => {
		vi.mocked(getHealth).mockRejectedValue(new ApiError(503, 'GET /health/ → 503'));

		render(BackendStatus);

		expect(await screen.findByText('Backend injoignable')).toBeInTheDocument();
	});
});
