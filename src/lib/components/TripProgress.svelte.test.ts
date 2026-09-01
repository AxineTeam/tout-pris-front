import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TripProgress from './TripProgress.svelte';
import type { ItemStatus, ProgressCategory, TripItem } from '$lib/api.js';

function status(id: number, progress: ProgressCategory): ItemStatus {
	return { id, name: `s${id}`, color: '#123456', progress, position: id, is_default: id === 1 };
}

let next = 0;

function line(progress: ProgressCategory): TripItem {
	next += 1;
	return {
		id: next,
		item_type: { id: 1, name: 'Tente', description: '' },
		person: null,
		quantity: 1,
		status: status(next, progress),
		position: next,
		kits: []
	};
}

describe('TripProgress', () => {
	it('proportionne les segments au nombre de lignes de chaque avancement', () => {
		render(TripProgress, {
			props: { lines: [line('not_started'), line('done'), line('done'), line('done')] }
		});

		expect(screen.getByTestId('trip-bar-not_started')).toHaveStyle({ width: '25%' });
		expect(screen.getByTestId('trip-bar-done')).toHaveStyle({ width: '75%' });
		expect(screen.queryByTestId('trip-bar-in_progress')).not.toBeInTheDocument();
		expect(screen.getByTestId('trip-progress')).toHaveAccessibleName('3 sur 4 prêts');
	});

	it('ne dessine rien sans ligne', () => {
		render(TripProgress, { props: { lines: [] } });

		expect(screen.queryByTestId('trip-progress')).not.toBeInTheDocument();
	});
});
