<script lang="ts" module>
	export const fieldClass = 'h-[46px] rounded-[10px] text-base';
	export const actionClass = 'h-12 w-full rounded-[11px] text-[15px] font-semibold';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children,
		footer
	}: {
		title: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<div class="my-auto w-full py-8">
	<h1 class="text-primary text-3xl leading-[1.05] font-bold">{title}</h1>
	<div class="mt-[22px] grid gap-[22px]">
		{@render children()}
	</div>
</div>

{#if footer}
	<div class="text-muted-foreground pb-4 text-center text-sm">
		{@render footer()}
	</div>
{/if}
