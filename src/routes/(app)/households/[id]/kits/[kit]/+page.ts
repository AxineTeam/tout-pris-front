import { error } from '@sveltejs/kit';
import { listPersons, readKit } from '$lib/api.js';
import { catalog } from '$lib/catalog.svelte.js';
import { households } from '$lib/households.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, m.household_unknown());
	const [kit, persons] = await Promise.all([
		readKit(household.id, Number(params.kit)),
		listPersons(household.id),
		catalog.ensureLoaded(household.id)
	]);
	return { household, kit, persons };
};
