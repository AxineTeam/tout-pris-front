import { baseLocale, overwriteGetLocale, toLocale, type Locale } from '$lib/paraglide/runtime.js';
import { session } from '$lib/session.svelte.js';

function spoken(...tags: (string | undefined)[]): Locale | undefined {
	for (const tag of tags) {
		const known = toLocale(tag) ?? toLocale(tag?.split('-')[0]);
		if (known) return known;
	}
}

// Un jour sans heure — « 2026-08-12 » — est lu en UTC par `new Date`, donc
// affiché la veille à l'ouest de Greenwich. Ses trois nombres sont posés tels
// quels sur un jour local, où un départ du 12 se lit le 12 partout.
function localDate(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(year, month - 1, day) : new Date(value);
}

function monthsLater(from: Date, count: number): Date {
	return new Date(from.getFullYear(), from.getMonth() + count, from.getDate());
}

function monthsBetween(from: Date, to: Date): number {
	const whole = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
	const reached = monthsLater(from, whole);
	const step = to < reached ? -1 : 1;
	const stride = monthsLater(from, whole + step);
	const beyond =
		Math.abs(to.getTime() - reached.getTime()) / Math.abs(stride.getTime() - reached.getTime());
	return whole + step * Math.round(beyond);
}

function away(day: string): [number, Intl.RelativeTimeFormatUnit] {
	const now = new Date();
	const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const to = localDate(day);

	const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
	if (Math.abs(days) <= 30) return [days, 'day'];

	const months = monthsBetween(from, to);
	if (Math.abs(months) <= 12) return [months, 'month'];

	return [Math.sign(months) * Math.round(Math.abs(months) / 12), 'year'];
}

class AppLocale {
	current = $derived(spoken(session.user?.language, ...navigator.languages) ?? baseLocale);
	#day = $derived(new Intl.DateTimeFormat(this.current, { dateStyle: 'long' }));
	#named = $derived(new Intl.RelativeTimeFormat(this.current, { numeric: 'auto' }));
	#counted = $derived(new Intl.RelativeTimeFormat(this.current, { numeric: 'always' }));

	day(moment: string): string {
		return this.#day.format(localDate(moment));
	}

	// Le pendant de `localDate` : le jour local rendu tel que l'attend un
	// <input type="date">. `toISOString` le daterait de la veille à l'ouest de
	// Greenwich.
	today(): string {
		const now = new Date();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${now.getFullYear()}-${month}-${day}`;
	}

	until(day: string): string {
		const [count, unit] = away(day);
		return unit === 'day' ? this.#named.format(count, unit) : this.#counted.format(count, unit);
	}
}

export const locale = new AppLocale();

overwriteGetLocale(() => locale.current);
