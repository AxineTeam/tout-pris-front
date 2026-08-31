import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { landing } from '$lib/households.js';
import { householdsQuery, queryClient } from '$lib/query.js';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const next = landing(await queryClient.query({ ...householdsQuery(), staleTime: 'static' }));
	if (!next) redirect(307, resolve('/(app)/households/new'));
	redirect(307, resolve('/(app)/households/[id]/trips', { id: String(next.id) }));
};
