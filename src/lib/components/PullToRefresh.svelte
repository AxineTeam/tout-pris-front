<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import XIcon from '@lucide/svelte/icons/x';
	import * as m from '$lib/paraglide/messages.js';
	import { atLeast, PULL_THRESHOLD, REFRESH_SETTLED, pulled } from '$lib/pull.js';
	import { queryClient } from '$lib/query.js';
	import { holdingRow } from '$lib/reorder.svelte.js';

	type Phase = 'idle' | 'pulling' | 'refreshing' | 'done' | 'failed';

	let { children }: { children: Snippet } = $props();

	let phase = $state<Phase>('idle');
	let travel = $state(0);
	let from: { finger: number; y: number } | null = null;
	let settling: ReturnType<typeof setTimeout> | undefined;

	let pull = $derived(pulled(travel));
	let armed = $derived(pull >= PULL_THRESHOLD);
	let offset = $derived(phase === 'pulling' ? pull : phase === 'idle' ? 0 : PULL_THRESHOLD);
	let announced = $derived.by(() => {
		if (phase === 'refreshing') return m.refresh_running();
		if (phase === 'done') return m.refresh_done();
		if (phase === 'failed') return m.refresh_failed();
		return '';
	});

	function pulling(touches: TouchList): Touch | null {
		for (let at = 0; at < touches.length; at++) {
			const touch = touches[at];
			if (touch && touch.identifier === from?.finger) return touch;
		}
		return null;
	}

	function move(event: TouchEvent) {
		const touch = pulling(event.touches);
		if (!from || !touch || holdingRow()) {
			forget();
			return;
		}
		travel = touch.clientY - from.y;
		if (travel <= 0) forget();
		else phase = 'pulling';
	}

	function forget() {
		from = null;
		travel = 0;
		if (phase === 'pulling') phase = 'idle';
	}

	function end(event: TouchEvent) {
		if (!from || !pulling(event.changedTouches)) return;
		const releases = phase === 'pulling' && armed;
		from = null;
		travel = 0;
		if (releases) void refresh();
		else if (phase === 'pulling') phase = 'idle';
	}

	function pullable(node: HTMLElement) {
		const start = (event: TouchEvent) => {
			const touch = event.touches[0];
			// A second finger turns the pull into something else, and a held row
			// already owns the first: `Reordering.grab` runs on `pointerdown`.
			if (event.touches.length !== 1 || !touch || holdingRow()) {
				forget();
				return;
			}
			if (phase === 'refreshing' || node.scrollTop > 0) return;
			from = { finger: touch.identifier, y: touch.clientY };
			travel = 0;
		};
		node.addEventListener('touchstart', start, { passive: true });
		node.addEventListener('touchmove', move, { passive: true });
		node.addEventListener('touchend', end, { passive: true });
		node.addEventListener('touchcancel', forget, { passive: true });
		return () => {
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchmove', move);
			node.removeEventListener('touchend', end);
			node.removeEventListener('touchcancel', forget);
		};
	}

	// Active queries only, which are the ones the shown screen holds: the same
	// reach as its polling, and the cache of the other households is left alone.
	async function refresh() {
		clearTimeout(settling);
		phase = 'refreshing';
		try {
			await atLeast(() =>
				queryClient.invalidateQueries({ type: 'active' }, { throwOnError: true })
			);
			phase = 'done';
		} catch {
			phase = 'failed';
		}
		settling = setTimeout(() => {
			if (phase === 'done' || phase === 'failed') phase = 'idle';
		}, REFRESH_SETTLED);
	}
</script>

<div {@attach pullable} class="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
	<div data-testid="pull-status" role="status" class="sr-only">{announced}</div>

	<div
		data-testid="pull-refresh"
		aria-hidden="true"
		class={[
			'pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center',
			phase === 'idle' && 'invisible',
			phase !== 'pulling' &&
				'transition-[transform,visibility] duration-200 motion-reduce:transition-none'
		]}
		style:transform="translateY({offset}px)"
	>
		<div
			class="border-border bg-card text-foreground flex size-9 -translate-y-full items-center justify-center rounded-full border shadow-sm"
		>
			{#if phase === 'refreshing'}
				<LoaderCircleIcon size={18} class="animate-spin motion-reduce:animate-none" />
			{:else if phase === 'done'}
				<CheckIcon size={18} />
			{:else if phase === 'failed'}
				<XIcon size={18} />
			{:else}
				<ArrowDownIcon
					size={18}
					class="transition-transform duration-150 motion-reduce:transition-none {armed
						? 'rotate-180'
						: ''}"
				/>
			{/if}
		</div>
	</div>

	{@render children()}
</div>
