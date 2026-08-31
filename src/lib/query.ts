import { QueryClient, queryOptions, type QueryKey } from '@tanstack/svelte-query';
import {
	listHouseholds,
	listInvitations,
	listItemStatuses,
	listItemTypes,
	listKits,
	listMembers,
	listPersons,
	listTrips,
	readKit
} from '$lib/api.js';

export const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } }
});

export const householdsQuery = () =>
	queryOptions({ queryKey: ['households'], queryFn: listHouseholds });

// L'écriture vient de rendre la représentation qui fait autorité : on la pose
// dans le cache au lieu de la redemander. Redemander serait à la fois faillible
// — un GET qui échoue après un POST réussi bloquerait la navigation, et le
// second essai créerait un doublon — et incertain : `Query.fetch` rend la
// promesse déjà en vol quand on ne lui passe pas `cancelRefetch`, donc la
// réponse pourrait dater d'avant l'écriture. Les `load` lisent en
// `staleTime: 'static'`, ils y trouveraient l'ancienne liste. L'invalidation
// qui suit laisse le serveur réconcilier en arrière-plan, sans que le chemin de
// succès dépende d'elle.
export function rewrite<T>(key: QueryKey, change: (all: T[]) => T[]): T[] {
	const next = change(queryClient.getQueryData<T[]>(key) ?? []);
	queryClient.setQueryData(key, next);
	void queryClient.invalidateQueries({ queryKey: key });
	return next;
}

// Toutes les clés d'un foyer prolongent la sienne : une écriture dont on ne sait
// pas ce qu'elle a touché s'invalide en une fois, sans réveiller les autres.
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

// Les personnes et les membres en une seule requête, parce que l'écran du foyer
// les croise : un « nouveau venu » est un membre sans personne. En deux requêtes
// indépendantes, les réponses arrivent dans deux ticks et l'écran rend entre les
// deux un état qui n'a jamais existé — une personne déjà détachée de son compte
// dont l'adhésion figure encore, donc un nouveau venu fantôme.
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

// La clé du détail prolonge celle de la liste : une écriture sur un kit change
// les deux, et une seule invalidation sur `kits` les emporte.
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

// Archiver un voyage le fait passer d'une liste à l'autre : les deux clés
// prolongent `tripsKey`, qu'une seule invalidation emporte.
export const tripsKey = (household: number) => [...householdKey(household), 'trips'];

export const tripsQuery = (household: number, archived = false) =>
	queryOptions({
		queryKey: [...tripsKey(household), archived ? 'archived' : 'active'],
		queryFn: () => listTrips(household, archived)
	});

export const itemsQuery = (household: number) =>
	queryOptions({
		queryKey: [...householdKey(household), 'items'],
		queryFn: () => listItemTypes(household)
	});
