<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children,
		...rest
	}: HTMLAnchorAttributes & { href: string; children: Snippet } = $props();
</script>

<a
	class={cn(
		'text-primary hover:text-primary/70 focus-visible:ring-ring/50 active:text-primary/50 rounded-sm font-semibold underline-offset-2 transition-colors outline-none hover:underline focus-visible:ring-[3px]',
		className
	)}
	{...rest}
>
	{@render children()}
</a>
