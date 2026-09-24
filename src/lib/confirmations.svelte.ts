// Only the repeated and reversible gestures are listed here: emptying a line
// of a trip or of a kit. Deleting a household, a person, a status, a whole kit
// or an email address carries away what nobody redoes, and keeps its
// confirmation whatever the reader answered elsewhere.
export const SILENCEABLE = ['trip-line', 'kit-line'] as const;

export type Confirmation = (typeof SILENCEABLE)[number];

// A comfort preference, tied to the device rather than to the account: one key
// per confirmation, so that silencing one never carries the others.
function key(which: Confirmation): string {
	return `tout-pris:silenced:${which}`;
}

function persisted(): Confirmation[] {
	return SILENCEABLE.filter((which) => localStorage.getItem(key(which)) !== null);
}

class Confirmations {
	#silenced = $state.raw<Confirmation[]>(persisted());

	get anySilenced(): boolean {
		return this.#silenced.length > 0;
	}

	asks(which: Confirmation): boolean {
		return !this.#silenced.includes(which);
	}

	silence(which: Confirmation): void {
		if (this.#silenced.includes(which)) return;
		this.#silenced = [...this.#silenced, which];
		localStorage.setItem(key(which), 'true');
	}

	askAgain(): void {
		this.#silenced = [];
		for (const which of SILENCEABLE) localStorage.removeItem(key(which));
	}
}

export const confirmations = new Confirmations();
