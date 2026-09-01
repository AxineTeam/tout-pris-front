<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	// Every screen stacks a heading over a list or a form. Holding that rhythm
	// here rather than in each screen is what keeps them from drifting apart, and
	// is the one place to touch when the spacing has to change again.
	let {
		title,
		heading,
		children,
		class: extra,
		...rest
	}: {
		title?: string;
		heading?: Snippet;
		children: Snippet;
		class?: string;
	} & Record<string, unknown> = $props();
</script>

<section class={cn('grid gap-2.5', extra)} {...rest}>
	{#if heading}
		{@render heading()}
	{:else if title}
		<h2 class="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
			{title}
		</h2>
	{/if}
	{@render children()}
</section>
