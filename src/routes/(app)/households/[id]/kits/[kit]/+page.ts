import { error } from '@sveltejs/kit';
import { catalog } from '$lib/catalog.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, kitQuery, personsQuery, queryClient } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	const kit = Number(params.kit);
	await Promise.all([
		queryClient.query(kitQuery(household.id, kit)),
		queryClient.query(personsQuery(household.id)),
		catalog.ensureLoaded(household.id)
	]);
	return { household, kit };
};
