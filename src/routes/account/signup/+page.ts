import { redirectWhenAuthenticated } from '$lib/navigation.js';
import type { PageLoad } from './$types';

export const load: PageLoad = redirectWhenAuthenticated;
