export class Reordering<T extends { id: number }> {
	#source: () => T[];
	#anchor: HTMLElement | undefined;
	#from = $state.raw<T[] | null>(null);
	#started: T[] | null = null;
	#arrangement = $state.raw<T[] | null>(null);
	grabbed = $state.raw<T | null>(null);

	constructor(source: () => T[]) {
		this.#source = source;
	}

	anchored = (node: HTMLElement) => {
		this.#anchor = node;
	};

	get rows(): T[] {
		const source = this.#source();
		return this.#arrangement && source === this.#from ? this.#arrangement : source;
	}

	#passed(row: T, y: number): boolean {
		const box = this.#anchor?.querySelector(`[data-row="${row.id}"]`)?.getBoundingClientRect();
		return box !== undefined && box.top + box.height / 2 < y;
	}

	#landing(moved: T, y: number): T[] {
		const rest = this.rows.filter((row) => row.id !== moved.id);
		const above = rest.filter((row) => this.#passed(row, y)).length;
		return [...rest.slice(0, above), moved, ...rest.slice(above)];
	}

	grab(event: PointerEvent, row: T): void {
		if (!this.#anchor || this.#source().length < 2) return;
		this.#anchor.setPointerCapture(event.pointerId);
		this.grabbed = row;
		this.#from = this.#source();
		this.#started = [...this.rows];
		this.#arrangement = [...this.rows];
	}

	drag(event: PointerEvent): void {
		if (this.grabbed) this.#arrangement = this.#landing(this.grabbed, event.clientY);
	}

	cancel(): void {
		this.grabbed = null;
		this.#arrangement = null;
	}

	forget(): void {
		this.#arrangement = null;
	}

	drop(): { row: T; to: number } | null {
		const moved = this.grabbed;
		const next = this.#arrangement;
		this.grabbed = null;
		if (!moved || !next) return null;
		const to = next.findIndex((row) => row.id === moved.id);
		if (to === (this.#started ?? []).findIndex((row) => row.id === moved.id)) return null;
		return { row: moved, to };
	}
}
