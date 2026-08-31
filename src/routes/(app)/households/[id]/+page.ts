import { error } from '@sveltejs/kit';
import { isOwner } from '$lib/households.js';
import * as m from '$lib/paraglide/messages.js';
import {
	householdsQuery,
	invitationsQuery,
	peopleQuery,
	queryClient,
	statusesQuery
} from '$lib/query.js';
import { session } from '$lib/session.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	await queryClient.query(statusesQuery(household.id));
	if (household.personal) return { household };
	const { members } = await queryClient.query(peopleQuery(household.id));
	if (isOwner(members, session.user?.id)) await queryClient.query(invitationsQuery(household.id));
	return { household };
};
