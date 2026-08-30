import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import RowCard from './RowCard.svelte';

const children = createRawSnippet(() => ({ render: () => '<span>Les statuts</span>' }));

describe('RowCard', () => {
	it('mène ailleurs quand on lui donne une destination', () => {
		render(RowCard, { props: { href: '/households/7/statuses', children } });

		expect(screen.getByRole('link', { name: 'Les statuts' })).toHaveAttribute(
			'href',
			'/households/7/statuses'
		);
	});

	it('agit sur place quand on ne lui en donne pas', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(RowCard, { props: { onclick, children } });

		await user.click(screen.getByRole('button', { name: 'Les statuts' }));

		expect(onclick).toHaveBeenCalled();
	});

	it('ignore le clic pendant que la demande précédente est en vol', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(RowCard, { props: { onclick, disabled: true, children } });

		await user.click(screen.getByRole('button', { name: 'Les statuts' }));

		expect(onclick).not.toHaveBeenCalled();
	});
});
