<script lang="ts">
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { actionClass } from '$lib/components/AccountScreen.svelte';
	import { Button, type ButtonProps } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let {
		label,
		busy = false,
		class: className,
		...rest
	}: Omit<ButtonProps, 'children'> & { label: string; busy?: boolean } = $props();
</script>

<Button class={cn(actionClass, className)} aria-busy={busy} {...rest}>
	{#if busy}
		<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
	{/if}
	{label}
</Button>
