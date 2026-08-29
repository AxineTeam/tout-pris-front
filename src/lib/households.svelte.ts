import { listHouseholds, type Household, type Member } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';

const LAST_VISITED = 'tout-pris:household';

class Households {
	all = $state.raw<Household[]>([]);
	#loading: Promise<void> | null = null;

	ensureLoaded(): Promise<void> {
		this.#loading ??= listHouseholds()
			.then((households) => {
				this.all = households;
			})
			.catch((error) => {
				this.#loading = null;
				throw error;
			});
		return this.#loading;
	}

	find(id: number): Household | undefined {
		return this.all.find((household) => household.id === id);
	}

	get landing(): Household | undefined {
		const remembered = Number(localStorage.getItem(LAST_VISITED));
		return this.find(remembered) ?? this.all.find((household) => household.personal) ?? this.all[0];
	}

	remember(id: number): void {
		localStorage.setItem(LAST_VISITED, String(id));
	}

	add(household: Household): void {
		this.all = [...this.all, household];
	}

	replace(household: Household): void {
		this.all = this.all.map((known) => (known.id === household.id ? household : known));
	}

	drop(id: number): void {
		this.all = this.all.filter((known) => known.id !== id);
	}

	reset(): void {
		this.all = [];
		this.#loading = null;
		localStorage.removeItem(LAST_VISITED);
	}
}

export const households = new Households();

export function isOwner(members: Member[], user: number | undefined): boolean {
	return members.some((member) => member.user === user && member.role === 'owner');
}

export function householdLabel(household: Household): string {
	return household.personal ? m.household_personal() : household.name;
}
