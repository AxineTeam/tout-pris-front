import { error } from '@sveltejs/kit';
import {
	listInvitations,
	listMembers,
	listPersons,
	type Invitation,
	type Member
} from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, 'Ce foyer n’existe pas.');
	const shared = !household.personal;
	const [persons, members, invitations] = await Promise.all([
		listPersons(household.id),
		shared ? listMembers(household.id) : Promise.resolve([] as Member[]),
		shared ? listInvitations(household.id) : Promise.resolve([] as Invitation[])
	]);
	return { household, persons, members, invitations };
};
