import type { ItemType } from '$lib/api.js';
import { itemsQuery, rewrite } from '$lib/query.js';

export function rewriteItems(household: number, change: (all: ItemType[]) => ItemType[]): void {
	rewrite(itemsQuery(household).queryKey, change);
}

export function remember(all: ItemType[], item: ItemType): ItemType[] {
	return all.some((known) => known.id === item.id)
		? all.map((known) => (known.id === item.id ? item : known))
		: [...all, item];
}

function fold(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

function inOrder(needle: string[], haystack: string): boolean {
	let reached = 0;
	for (const letter of haystack) {
		if (letter === needle[reached]) reached += 1;
	}
	return reached === needle.length;
}

function closeness(item: ItemType, needle: string, letters: string[]): number | null {
	const name = fold(item.name);
	if (name === needle) return 0;
	if (name.startsWith(needle)) return 1;
	if (inOrder(letters, name)) return 2;
	if (inOrder(letters, fold(item.description ?? ''))) return 3;
	return null;
}

export function search(items: ItemType[], typed: string): ItemType[] {
	const needle = fold(typed.trim());
	const letters = [...needle];
	const matches: { item: ItemType; closeness: number }[] = [];
	for (const item of items) {
		const rank = closeness(item, needle, letters);
		if (rank !== null) matches.push({ item, closeness: rank });
	}
	return matches.sort((left, right) => left.closeness - right.closeness).map((match) => match.item);
}
