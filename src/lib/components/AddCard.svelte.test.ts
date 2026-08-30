import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddCard from './AddCard.svelte';

describe('AddCard', () => {
	it('se nomme par son libellé', () => {
		render(AddCard, { props: { label: 'Ajouter une personne', onclick: vi.fn() } });

		expect(screen.getByRole('button', { name: 'Ajouter une personne' })).toBeVisible();
	});

	it('prévient au clic', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(AddCard, { props: { label: 'Inviter quelqu’un', onclick } });

		await user.click(screen.getByRole('button', { name: 'Inviter quelqu’un' }));

		expect(onclick).toHaveBeenCalled();
	});
});
