import { error } from '@sveltejs/kit';
import { listMembers, listPersons, type Member } from '$lib/api.js';
import { households } from '$lib/households.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	await households.ensureLoaded();
	const household = households.find(Number(params.id));
	if (!household) error(404, 'Ce foyer n’existe pas.');
	const [persons, members] = await Promise.all([
		listPersons(household.id),
		household.personal ? Promise.resolve([] as Member[]) : listMembers(household.id)
	]);
	return { household, persons, members };
};
