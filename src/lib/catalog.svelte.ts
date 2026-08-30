import { listItemTypes, type ItemType } from '$lib/api.js';

class Catalog {
	all = $state.raw<ItemType[]>([]);
	#household: number | null = null;
	#loading: Promise<void> | null = null;

	ensureLoaded(household: number): Promise<void> {
		if (this.#household !== household) {
			this.#household = household;
			this.#loading = null;
			this.all = [];
		}
		this.#loading ??= listItemTypes(household)
			.then((items) => {
				this.all = items;
			})
			.catch((refusal) => {
				this.#loading = null;
				throw refusal;
			});
		return this.#loading;
	}

	remember(item: ItemType): void {
		this.all = this.all.some((known) => known.id === item.id)
			? this.all.map((known) => (known.id === item.id ? item : known))
			: [...this.all, item];
	}
}

export const catalog = new Catalog();

export function fold(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function inOrder(needle: string, haystack: string): boolean {
	let reached = 0;
	for (const letter of haystack) {
		if (letter === needle[reached]) reached += 1;
	}
	return reached === needle.length;
}

function closeness(item: ItemType, needle: string): number | null {
	const name = fold(item.name);
	if (name === needle) return 0;
	if (name.startsWith(needle)) return 1;
	if (inOrder(needle, name)) return 2;
	if (inOrder(needle, fold(item.description))) return 3;
	return null;
}

export function search(items: ItemType[], typed: string): ItemType[] {
	const needle = fold(typed.trim());
	if (!needle) return items;
	const matches: { item: ItemType; closeness: number }[] = [];
	for (const item of items) {
		const rank = closeness(item, needle);
		if (rank !== null) matches.push({ item, closeness: rank });
	}
	return matches.sort((left, right) => left.closeness - right.closeness).map((match) => match.item);
}
