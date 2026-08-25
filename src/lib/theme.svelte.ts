import { MediaQuery } from 'svelte/reactivity';

export type ThemeChoice = 'system' | 'light' | 'dark';

const CHOICE = 'theme';

function persistedChoice(): ThemeChoice {
	const persisted = localStorage.getItem(CHOICE);
	return persisted === 'light' || persisted === 'dark' ? persisted : 'system';
}

class Theme {
	#systemPrefersDark = new MediaQuery('prefers-color-scheme: dark');
	choice = $state<ThemeChoice>(persistedChoice());

	get dark(): boolean {
		return this.choice === 'system' ? this.#systemPrefersDark.current : this.choice === 'dark';
	}

	choose(choice: ThemeChoice): void {
		this.choice = choice;
		if (choice === 'system') localStorage.removeItem(CHOICE);
		else localStorage.setItem(CHOICE, choice);
	}
}

export const theme = new Theme();
