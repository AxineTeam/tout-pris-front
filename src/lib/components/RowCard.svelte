<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type AnchorOnly = Exclude<keyof HTMLAnchorAttributes, keyof HTMLButtonAttributes>;
	type ButtonOnly = Exclude<keyof HTMLButtonAttributes, keyof HTMLAnchorAttributes>;

	type Row = { destructive?: boolean; children: Snippet };
	type Props =
		| (Row & HTMLButtonAttributes & Partial<Record<AnchorOnly, never>>)
		| (Row & HTMLAnchorAttributes & Partial<Record<ButtonOnly, never>> & { href: string });

	let { href, class: className, destructive = false, children, ...rest }: Props = $props();

	const linkAttributes = $derived(rest as HTMLAnchorAttributes);
	const buttonAttributes = $derived(rest as HTMLButtonAttributes);

	const shape =
		'focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50';

	let skin = $derived(
		destructive
			? 'border-destructive/40 bg-card text-destructive hover:bg-destructive/10 active:bg-destructive/20'
			: 'border-border bg-card hover:bg-accent active:bg-primary/25'
	);
</script>

{#if href}
	<a {href} class={cn(shape, skin, className)} {...linkAttributes}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={cn(shape, skin, className)} {...buttonAttributes}>
		{@render children()}
	</button>
{/if}
