<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { actionClass } from '$lib/components/AccountScreen.svelte';
	import { Button, type ButtonProps } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let {
		label,
		icon: Icon,
		busy = false,
		class: className,
		...rest
	}: Omit<ButtonProps, 'children'> & {
		label: string;
		icon?: LucideIcon;
		busy?: boolean;
	} = $props();
</script>

<Button class={cn(actionClass, className)} aria-busy={busy} {...rest}>
	{#if busy}
		<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
	{:else if Icon}
		<Icon aria-hidden="true" />
	{/if}
	{label}
</Button>
