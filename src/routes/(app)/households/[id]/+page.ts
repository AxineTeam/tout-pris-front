import { error } from '@sveltejs/kit';
import { listInvitations, listItemStatuses, listMembers, listPersons } from '$lib/api.js';
import { isOwner } from '$lib/households.js';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, queryClient } from '$lib/query.js';
import { session } from '$lib/session.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const all = await queryClient.query({ ...householdsQuery(), staleTime: 'static' });
	const household = all.find((known) => known.id === Number(params.id));
	if (!household) error(404, m.household_unknown());
	const statuses = await listItemStatuses(household.id);
	if (household.personal) return { household, statuses, persons: [], members: [], invitations: [] };
	const [persons, members] = await Promise.all([
		listPersons(household.id),
		listMembers(household.id)
	]);
	const owner = isOwner(members, session.user?.id);
	const invitations = owner ? await listInvitations(household.id) : [];
	return { household, statuses, persons, members, invitations };
};
