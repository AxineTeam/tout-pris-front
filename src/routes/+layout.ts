import { session } from '$lib/session.svelte.js';
import type { LayoutLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: LayoutLoad = () => session.ensureLoaded();
