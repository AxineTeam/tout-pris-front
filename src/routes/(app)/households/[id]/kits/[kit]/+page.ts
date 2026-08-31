import { error } from '@sveltejs/kit';
import { listPersons, readKit } from '$lib/api.js';
import { catalog } from '$lib/catalog.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, queryClient } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	const [kit, persons] = await Promise.all([
		readKit(household.id, Number(params.kit)),
		listPersons(household.id),
		catalog.ensureLoaded(household.id)
	]);
	return { household, kit, persons };
};
