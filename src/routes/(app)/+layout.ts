import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { session } from '$lib/session.svelte.js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
	await session.ensureLoaded();
	if (session.authenticated) return;
	const next = encodeURIComponent(url.pathname + url.search);
	redirect(307, `${resolve('/account/login')}?next=${next}`);
};
