import { error } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';
import {
	householdsQuery,
	itemsQuery,
	queryClient,
	statusesQuery,
	tripLinesQuery,
	tripQuery
} from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	const trip = Number(params.trip);
	await Promise.all([
		queryClient.query(tripQuery(household.id, trip)),
		queryClient.query(tripLinesQuery(household.id, trip)),
		queryClient.query(itemsQuery(household.id)),
		queryClient.query(statusesQuery(household.id))
	]);
	return { household, trip };
};
