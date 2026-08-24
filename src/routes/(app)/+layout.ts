import { redirect } from '@sveltejs/kit';
import { households } from '$lib/households.svelte.js';
import { loginPath } from '$lib/navigation.js';
import { session } from '$lib/session.svelte.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
	await session.ensureLoaded();
	if (!session.authenticated) redirect(307, loginPath(url.pathname + url.search));
	await households.ensureLoaded();
};
