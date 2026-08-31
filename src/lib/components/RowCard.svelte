<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type AnchorOnly = Exclude<keyof HTMLAnchorAttributes, keyof HTMLButtonAttributes>;
	type ButtonOnly = Exclude<keyof HTMLButtonAttributes, keyof HTMLAnchorAttributes>;

	type Row = { destructive?: boolean; actions?: Snippet; children: Snippet };
	type Props =
		| (Row & HTMLButtonAttributes & Partial<Record<AnchorOnly, never>>)
		| (Row & HTMLAnchorAttributes & Partial<Record<ButtonOnly, never>> & { href: string });

	let { href, class: className, destructive = false, actions, children, ...rest }: Props = $props();

	const linkAttributes = $derived(rest as HTMLAnchorAttributes);
	const buttonAttributes = $derived(rest as HTMLButtonAttributes);

	const shape =
		'flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-50';
	const ringed =
		'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]';

	// Le lien étiré : sa cible couvre la carte entière, ce qui laisse le bouton
	// des actions à côté de lui plutôt que dedans — un <button> dans un <a> est
	// du HTML invalide. Son anneau se dessine sur la même étendue.
	// Le survol reste porté par la carte, qu'il ne peut pas quitter : posé sur
	// ce pseudo-élément, qui est peint par-dessus le contenu du lien, il
	// couvrirait le texte. La carte s'éteint donc à la main quand le pointeur
	// désigne une action — seule chose au-dessus du lien étiré, donc seule à
	// recevoir :hover ailleurs que sur lui.
	const stretched =
		'focus-visible:after:border-ring focus-visible:after:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 outline-none after:absolute after:-inset-px after:rounded-xl focus-visible:after:border focus-visible:after:ring-[3px]';

	let skin = $derived(
		destructive
			? 'border-destructive/40 bg-card text-destructive hover:bg-destructive/10 active:bg-destructive/20'
			: 'border-border bg-card hover:bg-accent active:bg-primary/25'
	);
</script>

{#if actions}
	<div class={cn(shape, skin, 'relative has-[>:not(:first-child):hover]:bg-card', className)}>
		{#if href}
			<a {href} class={stretched} {...linkAttributes}>
				{@render children()}
			</a>
		{:else}
			<button type="button" class={stretched} {...buttonAttributes}>
				{@render children()}
			</button>
		{/if}
		{@render actions()}
	</div>
{:else if href}
	<a {href} class={cn(shape, ringed, skin, className)} {...linkAttributes}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={cn(shape, ringed, skin, className)} {...buttonAttributes}>
		{@render children()}
	</button>
{/if}
