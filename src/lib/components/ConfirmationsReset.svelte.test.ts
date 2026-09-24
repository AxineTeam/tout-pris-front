import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import ConfirmationsReset from './ConfirmationsReset.svelte';
import { confirmations } from '$lib/confirmations.svelte.js';

const heading = createRawSnippet(() => ({ render: () => '<h2>Confirmations</h2>' }));

function show() {
	return render(ConfirmationsReset, { props: { heading } });
}

const restore = () => screen.queryByRole('button', { name: 'Redemander confirmation' });

describe('ConfirmationsReset', () => {
	beforeEach(() => {
		localStorage.clear();
		confirmations.askAgain();
	});

	it('ne se montre pas tant qu’aucune confirmation n’est désactivée', () => {
		show();

		expect(restore()).not.toBeInTheDocument();
		expect(screen.queryByText('Confirmations')).not.toBeInTheDocument();
	});

	it('paraît dès qu’une confirmation est désactivée', () => {
		confirmations.silence('kit-line');

		show();

		expect(restore()).toBeVisible();
		expect(screen.getByText('Confirmations')).toBeVisible();
	});

	it('remet toutes les confirmations puis s’efface', async () => {
		const user = userEvent.setup();
		confirmations.silence('trip-line');
		confirmations.silence('kit-line');
		show();

		await user.click(restore() as HTMLElement);

		expect(confirmations.asks('trip-line')).toBe(true);
		expect(confirmations.asks('kit-line')).toBe(true);
		expect(restore()).not.toBeInTheDocument();
	});
});
