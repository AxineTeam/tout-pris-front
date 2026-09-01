import { tick } from 'svelte';

// The gesture states an order; the server holds ranks. Sending every rank would
// be one request per row for a move of one, so the wanted order is replayed
// against the current one and only the rows whose rank actually changes are
// sent — dropping a three-row object below a one-row object costs the single
// request that moves the latter. The caller says how to send a rank, since each
// screen has its own route for it.
export async function rerank<T extends { id: number }>(
	wanted: T[],
	current: T[],
	rank: (row: T, at: number) => Promise<unknown>
): Promise<void> {
	const held = [...current];
	for (const [at, row] of wanted.entries()) {
		if (held[at]?.id === row.id) continue;
		await rank(row, at);
		held.splice(
			held.findIndex((known) => known.id === row.id),
			1
		);
		held.splice(at, 0, row);
	}
}

export class Reordering<T extends { id: number }> {
	#source: () => T[];
	#anchor: HTMLElement | undefined;
	#from = $state.raw<T[] | null>(null);
	#started: T[] | null = null;
	#hold = 0;
	#arrangement = $state.raw<T[] | null>(null);
	grabbed = $state.raw<T | null>(null);
	offset = $state(0);

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

	protected boxOf(selector: string): DOMRect | undefined {
		return this.#anchor?.querySelector(selector)?.getBoundingClientRect();
	}

	protected middleOf(row: T): number | undefined {
		const box = this.boxOf(`[data-row="${row.id}"]`);
		return box && box.top + box.height / 2;
	}

	protected passed(row: T, y: number): boolean {
		const middle = this.middleOf(row);
		return middle !== undefined && middle < y;
	}

	protected landing(moved: T, y: number): T[] {
		const rest = this.rows.filter((row) => row.id !== moved.id);
		const above = rest.filter((row) => this.passed(row, y)).length;
		return [...rest.slice(0, above), moved, ...rest.slice(above)];
	}

	grab(event: PointerEvent, row: T): void {
		if (!this.#anchor || this.#source().length < 2) return;
		this.#anchor.setPointerCapture(event.pointerId);
		this.grabbed = row;
		this.#from = this.#source();
		this.#started = [...this.rows];
		this.#arrangement = [...this.rows];
		this.offset = 0;
		this.#hold = event.clientY - (this.middleOf(row) ?? event.clientY);
	}

	async drag(event: PointerEvent): Promise<void> {
		const moved = this.grabbed;
		if (!moved) return;
		const y = event.clientY;
		this.#arrangement = this.landing(moved, y);
		await tick();
		if (this.grabbed !== moved) return;
		const middle = this.middleOf(moved);
		if (middle !== undefined) this.offset += y - this.#hold - middle;
	}

	cancel(): void {
		this.grabbed = null;
		this.offset = 0;
		this.#arrangement = null;
	}

	forget(): void {
		this.#arrangement = null;
	}

	// A rank alone does not say whether the gesture changed anything: the
	// statuses screen also moves a row between sections, which can leave the
	// rank where it was. Both ends of the move are handed back, and the caller
	// says what counts as a move.
	drop(): { row: T; from: number; to: number } | null {
		const moved = this.grabbed;
		const next = this.#arrangement;
		this.grabbed = null;
		this.offset = 0;
		if (!moved || !next) return null;
		const at = (rows: T[]) => rows.findIndex((row) => row.id === moved.id);
		return { row: moved, from: at(this.#started ?? []), to: at(next) };
	}
}
