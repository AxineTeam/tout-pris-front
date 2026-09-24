import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import TripSort from './TripSort.svelte';

type User = ReturnType<typeof userEvent.setup>;

function opener() {
	return screen.getByTestId('trip-sort-open');
}

async function open(user: User) {
	await user.click(opener());
	return await screen.findByRole('dialog');
}

// bits-ui lifts the `pointer-events: none` it lays on the page a beat after the
// dialog unmounts, so reopening right after a choice would click a page that
// still refuses pointers.
async function choose(user: User, label: string) {
	const sheet = await open(user);
	await user.click(within(sheet).getByRole('button', { name: label }));
	await waitFor(() => {
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(document.body.style.pointerEvents).not.toBe('none');
	});
}

// Le tri en cours ne se lit pas sur le bouton fermé, qui nomme ce qu'il fait :
// il se lit sur la ligne marquée dans la fenêtre, là où un lecteur le trouve.
async function marked(user: User): Promise<HTMLElement> {
	const sheet = await open(user);
	const pressed = within(sheet)
		.getAllByRole('button', { name: /^Trier / })
		.filter((one) => one.getAttribute('aria-pressed') === 'true');
	expect(pressed).toHaveLength(1);
	return pressed[0];
}

describe('TripSort', () => {
	it('nomme l’action qu’il ouvre, pas l’ordre en cours', () => {
		render(TripSort);

		expect(opener()).toHaveAccessibleName('Trier la liste');
		expect(opener()).toHaveAttribute('aria-haspopup', 'dialog');
	});

	it('offre les trois tris dans une fenêtre nommée', async () => {
		const user = userEvent.setup();
		render(TripSort);

		const sheet = await open(user);

		expect(sheet).toHaveAccessibleName('Trier la liste');
		expect(within(sheet).getAllByRole('button', { name: /^Trier / })).toHaveLength(3);
	});

	it('marque le tri en cours et lui seul', async () => {
		const user = userEvent.setup();
		render(TripSort, { props: { sorted: 'name' } });

		expect(await marked(user)).toHaveAccessibleName('Trier par nom, de A à Z');
	});

	it('ferme la fenêtre sur le tri choisi', async () => {
		const user = userEvent.setup();
		render(TripSort);

		await choose(user, 'Trier par kit, du premier kit au dernier');

		expect(await marked(user)).toHaveAccessibleName('Trier par kit, du premier kit au dernier');
	});

	it('renverse le tri déjà en cours plutôt que de le rechoisir', async () => {
		const user = userEvent.setup();
		render(TripSort, { props: { sorted: 'name' } });

		await choose(user, 'Trier par nom, de A à Z');

		expect(await marked(user)).toHaveAccessibleName('Trier par nom, de Z à A');
	});

	it('remet un tri neuf à l’endroit', async () => {
		const user = userEvent.setup();
		render(TripSort, { props: { sorted: 'name', direction: 'down' } });

		await choose(user, 'Trier par kit, du premier kit au dernier');

		expect(await marked(user)).toHaveAccessibleName('Trier par kit, du premier kit au dernier');
	});
});
