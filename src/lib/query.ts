import { QueryClient, queryOptions } from '@tanstack/svelte-query';
import { listHouseholds } from '$lib/api.js';

export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } }
});

export const householdsQuery = () =>
	queryOptions({ queryKey: ['households'], queryFn: listHouseholds });
