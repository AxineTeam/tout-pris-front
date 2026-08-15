import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StuffListRow from './StuffListRow.svelte';

describe('StuffListRow', () => {
	const stufflist = { id: 7, name: 'Courses de la semaine' };

	it('affiche le nom de la liste', () => {
		render(StuffListRow, { props: { stufflist } });

		expect(screen.getByText('Courses de la semaine')).toBeInTheDocument();
	});

	it('appelle ondelete avec l’id au clic sur Supprimer', async () => {
		const user = userEvent.setup();
		const ondelete = vi.fn();
		render(StuffListRow, { props: { stufflist, ondelete } });

		await user.click(screen.getByRole('button', { name: 'Supprimer Courses de la semaine' }));

		expect(ondelete).toHaveBeenCalledWith(7);
	});
});
