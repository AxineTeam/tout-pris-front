import { error } from '@sveltejs/kit';
import { listTrips } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, m.household_unknown());
	const [trips, archived] = await Promise.all([
		listTrips(household.id),
		listTrips(household.id, true)
	]);
	return { household, trips, archived };
};
