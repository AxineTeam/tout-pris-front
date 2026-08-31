import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, itemsQuery, kitQuery, personsQuery, queryClient } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	const kit = Number(params.kit);
	await Promise.all([
		queryClient.query(kitQuery(household.id, kit)),
		queryClient.query(personsQuery(household.id)),
		queryClient.query(itemsQuery(household.id))
	]);
	return { household, kit };
};
