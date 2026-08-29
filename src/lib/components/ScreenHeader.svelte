<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import * as m from '$lib/paraglide/messages.js';

	interface Action {
		label: string;
		icon: LucideIcon;
		onclick: () => void;
	}

	let {
		title,
		subtitle,
		back,
		actions = []
	}: {
		title: string;
		subtitle?: string;
		back?: string;
		actions?: Action[];
	} = $props();
</script>

<header class="border-border flex items-start gap-2 border-b pb-3">
	{#if back}
		<a
			href={back}
			aria-label={m.back()}
			class="text-primary -ml-2 flex size-11 flex-none items-center justify-center"
		>
			<ChevronLeftIcon size={22} aria-hidden="true" />
		</a>
	{/if}
	<div class="min-w-0 flex-1">
		<h1 class="truncate text-xl leading-tight font-bold">{title}</h1>
		{#if subtitle}
			<p class="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</p>
		{/if}
	</div>
	{#if actions.length > 0}
		<div class="flex flex-none items-center gap-2">
			{#each actions as action (action.label)}
				<button
					type="button"
					aria-label={action.label}
					onclick={action.onclick}
					class="border-border bg-card text-primary relative flex size-[34px] items-center justify-center rounded-md border after:absolute after:-inset-[5px] after:content-['']"
				>
					<action.icon size={16} aria-hidden="true" />
				</button>
			{/each}
		</div>
	{/if}
</header>
