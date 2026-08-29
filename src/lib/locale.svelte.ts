import { baseLocale, overwriteGetLocale, toLocale, type Locale } from '$lib/paraglide/runtime.js';
import { session } from '$lib/session.svelte.js';

function spoken(...tags: (string | undefined)[]): Locale | undefined {
	for (const tag of tags) {
		const known = toLocale(tag) ?? toLocale(tag?.split('-')[0]);
		if (known) return known;
	}
}

class AppLocale {
	current = $derived(spoken(session.user?.language, ...navigator.languages) ?? baseLocale);
	#day = $derived(new Intl.DateTimeFormat(this.current, { dateStyle: 'long' }));

	day(moment: string): string {
		return this.#day.format(new Date(moment));
	}
}

export const locale = new AppLocale();

overwriteGetLocale(() => locale.current);
