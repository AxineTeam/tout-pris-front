<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { ItemStatus } from '$lib/api.js';

	// The household picks the colour, so only the ground is tinted and the label
	// keeps the page's ink: a pale amber and a deep green both stay readable,
	// which a label drawn in the household's own colour would not.
	//
	// The pill is drawn at 28 px and widened by a pseudo-element to the 44 px a
	// touch target needs. `tight` is for the rows that leave it no room — the 36
	// px person rows of the two list screens — where the halo stops at the row's
	// edge rather than reaching over the line below and taking its taps.
	let {
		status,
		label,
		busy = false,
		tight = false,
		onadvance,
		onpick
	}: {
		status: ItemStatus;
		label: string;
		busy?: boolean;
		tight?: boolean;
		onadvance?: () => void;
		onpick?: () => void;
	} = $props();

	let reach = $derived(tight ? 'after:-inset-y-1' : 'after:-inset-y-2');

	// The click that ends a hold must not advance on top of the list it opened.
	// `held` is cleared by the next pointerdown rather than by that click: a
	// browser that cancels the pointer after its own long press never sends it.
	const HOLD_MS = 1000;
	const WANDER_PX = 8;
	let holding: ReturnType<typeof setTimeout> | undefined;
	let held = false;
	let origin = { x: 0, y: 0 };

	function pick() {
		if (holding !== undefined) {
			disarm();
			held = true;
		}
		onpick?.();
	}

	function arm(event: PointerEvent) {
		if (!onpick || event.button !== 0) return;
		disarm();
		held = false;
		origin = { x: event.clientX, y: event.clientY };
		holding = setTimeout(pick, HOLD_MS);
	}

	function disarm() {
		clearTimeout(holding);
		holding = undefined;
	}

	function wandered(event: PointerEvent) {
		if (holding === undefined) return;
		if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > WANDER_PX) disarm();
	}

	function tapped() {
		if (held) return;
		onadvance?.();
	}

	function contextmenu(event: Event) {
		if (!onpick) return;
		event.preventDefault();
		pick();
	}

	onDestroy(disarm);
</script>

{#if onadvance}
	<button
		type="button"
		aria-label={label}
		disabled={busy}
		onclick={tapped}
		onpointerdown={arm}
		onpointerup={disarm}
		onpointercancel={disarm}
		onpointerleave={disarm}
		onpointermove={wandered}
		oncontextmenu={contextmenu}
		style:background-color="color-mix(in oklab, {status.color} 16%, transparent)"
		class={[
			'focus-visible:ring-ring/50 relative flex h-7 min-w-0 flex-none touch-pan-y items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-opacity outline-none select-none after:absolute after:-inset-x-1',
			reach,
			"after:content-[''] hover:opacity-80 focus-visible:ring-[3px] disabled:opacity-50"
		]}
	>
		<span
			aria-hidden="true"
			class="size-[9px] flex-none rounded-full"
			style:background-color={status.color}
		></span>
		<span class="truncate">{status.name}</span>
	</button>
{:else}
	<span
		style:background-color="color-mix(in oklab, {status.color} 16%, transparent)"
		class="flex h-7 min-w-0 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
	>
		<span
			aria-hidden="true"
			class="size-[9px] flex-none rounded-full"
			style:background-color={status.color}
		></span>
		<span class="truncate">{status.name}</span>
	</span>
{/if}
