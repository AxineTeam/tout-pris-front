import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { Household, Member } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';
import { householdsQuery, rewrite } from '$lib/query.js';

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

export function rewriteHouseholds(change: (all: Household[]) => Household[]): Household[] {
	return rewrite(householdsQuery().queryKey, change);
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
