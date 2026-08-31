import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, kitsQuery, queryClient } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	await queryClient.query(kitsQuery(household.id));
	return { household };
};
