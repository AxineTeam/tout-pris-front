import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { households } from '$lib/households.svelte.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	await households.ensureLoaded();
	const landing = households.landing;
	if (!landing) redirect(307, resolve('/(app)/households/new'));
	redirect(307, resolve('/(app)/households/[id]', { id: String(landing.id) }));
};
