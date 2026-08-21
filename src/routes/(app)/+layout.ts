import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { households } from '$lib/households.svelte.js';
import { session } from '$lib/session.svelte.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
	await session.ensureLoaded();
	if (!session.authenticated) {
		const next = encodeURIComponent(url.pathname + url.search);
		redirect(307, `${resolve('/account/login')}?next=${next}`);
	}
	await households.ensureLoaded();
};
