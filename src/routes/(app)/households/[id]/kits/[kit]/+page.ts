import { error } from '@sveltejs/kit';
import { readKit } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, m.household_unknown());
	return { household, kit: await readKit(household.id, Number(params.kit)) };
};
