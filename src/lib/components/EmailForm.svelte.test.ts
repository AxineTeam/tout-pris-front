import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmailForm from './EmailForm.svelte';

describe('EmailForm', () => {
	it('soumet l’adresse débarrassée de ses espaces', async () => {
		const user = userEvent.setup();
		const onsubmit = vi.fn().mockResolvedValue([]);
		render(EmailForm, { props: { submitLabel: 'Envoyer', onsubmit } });

		await user.type(screen.getByLabelText('Adresse email'), '  camille@example.com  ');
		await user.click(screen.getByRole('button', { name: 'Envoyer' }));

		expect(onsubmit).toHaveBeenCalledWith('camille@example.com');
	});
});
