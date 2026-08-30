<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		triggerClass,
		align = 'left',
		trigger,
		children
	}: {
		label: string;
		triggerClass: string;
		align?: 'left' | 'right';
		trigger: Snippet;
		children: Snippet<[() => void]>;
	} = $props();

	let anchor = $state.raw<HTMLElement>();
	let open = $state(false);

	function anchored(node: HTMLElement) {
		anchor = node;
	}

	function close() {
		open = false;
	}

	function elsewhere(event: Event) {
		if (open && anchor && !anchor.contains(event.target as Node)) close();
	}

	function escaped(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onpointerdown={elsewhere} onkeydown={escaped} />

<div class="relative" {@attach anchored}>
	<button
		type="button"
		aria-label={label}
		aria-haspopup="menu"
		aria-expanded={open}
		onclick={() => (open = !open)}
		class={triggerClass}
	>
		{@render trigger()}
	</button>

	{#if open}
		<div
			role="menu"
			aria-label={label}
			class={[
				'bg-popover text-popover-foreground border-border absolute top-full z-20 mt-2 flex w-60 max-w-[80vw] flex-col rounded-xl border p-1.5 shadow-lg',
				align === 'right' ? 'right-0' : 'left-0'
			]}
		>
			{@render children(close)}
		</div>
	{/if}
</div>
