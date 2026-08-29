import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { households } from '$lib/households.svelte.js';
import * as m from '$lib/paraglide/messages.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	await households.ensureLoaded();
	const landing = households.landing;
	if (!landing) error(500, m.no_household());
	redirect(307, resolve('/(app)/households/[id]', { id: String(landing.id) }));
};
