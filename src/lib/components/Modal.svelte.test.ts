import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal.svelte';

const children = createRawSnippet(() => ({
	render: () => '<p>Ce foyer et tout ce qu’il contient.</p>'
}));

const form = createRawSnippet(() => ({
	render: () => '<label>Nom du foyer<input /></label>'
}));

function mount(onclose = vi.fn(), description?: string) {
	render(Modal, { props: { title: 'Supprimer le foyer', description, onclose, children } });
	return onclose;
}

describe('Modal', () => {
	it('se nomme par son titre pour un lecteur d’écran', async () => {
		mount();

		expect(await screen.findByRole('dialog')).toHaveAccessibleName('Supprimer le foyer');
	});

	it('annonce sa description avec son titre', async () => {
		mount(vi.fn(), 'C’est définitif.');

		expect(await screen.findByRole('dialog')).toHaveAccessibleDescription('C’est définitif.');
	});

	it('se ferme sur Échap', async () => {
		const user = userEvent.setup();
		const onclose = mount();
		await screen.findByRole('dialog');

		await user.keyboard('{Escape}');

		expect(onclose).toHaveBeenCalled();
	});

	it('se ferme par son bouton de fermeture nommé', async () => {
		const user = userEvent.setup();
		const onclose = mount();
		const opened = await screen.findByRole('dialog');

		await user.click(within(opened).getByRole('button', { name: 'Fermer' }));

		expect(onclose).toHaveBeenCalled();
	});

	it('pose le focus sur le premier champ à l’ouverture', async () => {
		render(Modal, { props: { title: 'Renommer le foyer', onclose: vi.fn(), children: form } });
		const opened = await screen.findByRole('dialog');

		await waitFor(() => expect(within(opened).getByLabelText('Nom du foyer')).toHaveFocus());
	});

	it('laisse le focus à la boîte quand elle n’a aucun champ', async () => {
		mount();
		const opened = await screen.findByRole('dialog');

		await waitFor(() => expect(opened).toHaveFocus());
	});

	it('rend l’écran au reste de la page une fois refermée', async () => {
		const user = userEvent.setup();
		const clicked = vi.fn();
		const { container, unmount } = render(Modal, {
			props: { title: 'Supprimer le foyer', onclose: vi.fn(), children }
		});
		await screen.findByRole('dialog');
		const outside = document.createElement('button');
		outside.addEventListener('click', clicked);
		container.append(outside);

		unmount();

		await waitFor(() => expect(document.body).not.toHaveStyle({ pointerEvents: 'none' }));
		await user.click(outside);

		expect(clicked).toHaveBeenCalled();
	});
});
