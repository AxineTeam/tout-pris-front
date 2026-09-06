import { QueryClient, queryOptions, type QueryKey } from '@tanstack/svelte-query';
import {
	listHouseholds,
	listInvitations,
	listItemStatuses,
	listItemTypes,
	listKits,
	listMembers,
	listPersons,
	listTripItems,
	listTrips,
	readKit,
	readTrip
} from '$lib/api.js';

export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } }
});

export const householdsQuery = () =>
	queryOptions({ queryKey: ['households'], queryFn: listHouseholds });

// The write just returned the authoritative representation: it goes into the
// cache instead of being asked for again. Asking again would be fallible — a
// GET failing after a successful POST would block navigation — and uncertain:
// `Query.fetch` returns the in-flight promise when it is not given
// `cancelRefetch`, so the answer could predate the write. The `load`s read with
// `staleTime: 'static'` and never refetch a stale entry, so the invalidation
// that follows reconciles the screens in the background but cannot stand in for
// this write.
export function rewrite<T>(key: QueryKey, change: (all: T[]) => T[]): T[] {
	const next = change(queryClient.getQueryData<T[]>(key) ?? []);
	queryClient.setQueryData(key, next);
	void queryClient.invalidateQueries({ queryKey: key });
	return next;
}

// Every key of a household extends its own, and every detail key extends its
// list's: a write whose reach is unknown is invalidated in one go, without
// waking the other households.
export const householdKey = (household: number) => ['household', household];

export const statusesQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'statuses'],
		queryFn: () => listItemStatuses(household)
	});

export const personsQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'persons'],
		queryFn: () => listPersons(household)
	});

// Two independent queries would land in two ticks, and the screen would render
// in between a state that never existed: a person already detached from their
// account whose membership still shows, hence a phantom newcomer.
export const peopleQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'people'],
		queryFn: async () => {
			const [persons, members] = await Promise.all([
				listPersons(household),
				listMembers(household)
			]);
			return { persons, members };
		}
	});

export const invitationsQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'invitations'],
		queryFn: () => listInvitations(household)
	});

export const kitsQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'kits'],
		queryFn: () => listKits(household)
	});

export const kitQuery = (household: number, kit: number) =>
	queryOptions({
		queryKey: [...kitsQuery(household).queryKey, kit],
		queryFn: () => readKit(household, kit)
	});

// Archiving moves a trip from one list to the other, and the detail extends
// them both: a single invalidation on `tripsKey` carries all three.
export const tripsKey = (household: number) => [...householdKey(household), 'trips'];

export const tripsQuery = (household: number, archived = false) =>
	queryOptions({
		queryKey: [...tripsKey(household), archived ? 'archived' : 'active'],
		queryFn: () => listTrips(household, archived)
	});

export const tripQuery = (household: number, trip: number) =>
	queryOptions({
		queryKey: [...tripsKey(household), trip],
		queryFn: () => readTrip(household, trip)
	});

// Their own key rather than the copy the detail carries, which would drift
// apart at the first tick. This is also the route that carries the ETag, the
// one polling reads: the browser revalidates it on its own, so a tick that
// changed nothing costs a 304 and no parsing.
//
// Kept quiet while a finger holds a card — a response landing mid-gesture
// re-derives the rows under it — and while a write is in flight, whose answer
// is the one to wait for.
export const tripLinesQuery = (household: number, trip: number, quiet = false) =>
	queryOptions({
		queryKey: [...tripsKey(household), trip, 'lines'],
		queryFn: () => listTripItems(household, trip),
		refetchInterval: quiet ? false : 3000
	});

export const itemsQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'items'],
		queryFn: () => listItemTypes(household)
	});
