import { listHouseholds, type Household } from '$lib/api.js';

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

	reset(): void {
		this.all = [];
		this.#loading = null;
		localStorage.removeItem(LAST_VISITED);
	}
}

export const households = new Households();

export function householdLabel(household: Household): string {
	return household.personal ? 'Personnel' : household.name;
}
