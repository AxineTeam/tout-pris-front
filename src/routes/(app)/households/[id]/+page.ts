import { error } from '@sveltejs/kit';
import { households } from '$lib/households.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, 'Ce foyer n’existe pas.');
	households.remember(household.id);
	return { household };
};
