<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

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
	} & HTMLAttributes<HTMLElement> = $props();
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
