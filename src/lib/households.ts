import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Household, Member } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, queryClient } from '$lib/query.js';

const LAST_VISITED = 'tout-pris:household';

export function landing(all: Household[]): Household | undefined {
	const remembered = Number(localStorage.getItem(LAST_VISITED));
	return (
		all.find((household) => household.id === remembered) ??
		all.find((household) => household.personal) ??
		all[0]
	);
}

export function remember(id: number): void {
	localStorage.setItem(LAST_VISITED, String(id));
}

export function forgetVisited(): void {
	localStorage.removeItem(LAST_VISITED);
}

// L'écriture vient de rendre la représentation qui fait autorité : on la pose
// dans le cache au lieu de la redemander. Redemander serait à la fois faillible
// — un GET qui échoue après un POST réussi bloquerait la navigation, et le
// second essai créerait un doublon — et incertain : `Query.fetch` rend la
// promesse déjà en vol quand on ne lui passe pas `cancelRefetch`, donc la
// réponse pourrait dater d'avant l'écriture. Les `load` lisent en
// `staleTime: 'static'`, ils y trouveraient l'ancienne liste et un 404.
// L'invalidation qui suit laisse le serveur réconcilier en arrière-plan, sans
// que le chemin de succès dépende d'elle.
export function rewriteHouseholds(change: (all: Household[]) => Household[]): Household[] {
	const all = queryClient.getQueryData(householdsQuery().queryKey) ?? [];
	const next = change(all);
	queryClient.setQueryData(householdsQuery().queryKey, next);
	void queryClient.invalidateQueries({ queryKey: householdsQuery().queryKey });
	return next;
}

export async function leaveBehind(id: number): Promise<void> {
	const next = landing(rewriteHouseholds((all) => all.filter((known) => known.id !== id)));
	await goto(
		next
			? resolve('/(app)/households/[id]', { id: String(next.id) })
			: resolve('/(app)/households/new')
	);
}

export function isOwner(members: Member[], user: number | undefined): boolean {
	return members.some((member) => member.user === user && member.role === 'owner');
}

export function householdLabel(household: Household): string {
	return household.personal ? m.household_personal() : household.name;
}
