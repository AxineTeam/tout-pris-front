import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, queryClient, tripsQuery } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	await Promise.all([
		queryClient.query(tripsQuery(household.id)),
		queryClient.query(tripsQuery(household.id, true))
	]);
	return { household };
};
