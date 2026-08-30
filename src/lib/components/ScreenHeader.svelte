<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { page } from '$app/state';
	import HouseholdSwitcher from '$lib/components/HouseholdSwitcher.svelte';
	import { households } from '$lib/households.svelte.js';
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
		switcher = false,
		actions = []
	}: {
		title: string;
		subtitle?: string;
		back?: string;
		switcher?: boolean;
		actions?: Action[];
	} = $props();

	let current = $derived(households.find(Number(page.params.id)));
</script>

<header class="grid gap-1.5">
	<div class="flex items-center gap-2">
		{#if back}
			<a
				href={back}
				aria-label={m.back()}
				class="text-primary hover:bg-accent focus-visible:ring-ring/50 active:bg-primary/25 -ml-2 flex size-11 flex-none items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
			>
				<ChevronLeftIcon size={22} aria-hidden="true" />
			</a>
		{/if}
		<div class="min-w-0 flex-1">
			<h1
				data-testid="screen-title"
				class={['truncate leading-tight font-bold', back ? 'text-xl' : 'text-[26px]']}
			>
				{title}
			</h1>
			{#if subtitle}
				<p data-testid="subtitle" class="text-muted-foreground mt-0.5 text-[12.5px]">
					{subtitle}
				</p>
			{/if}
		</div>
		{#if actions.length > 0}
			<div class="flex flex-none items-center gap-2">
				{#each actions as action (action.label)}
					<button
						type="button"
						aria-label={action.label}
						onclick={action.onclick}
						class="border-border bg-card text-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 active:bg-primary/25 relative flex size-[34px] items-center justify-center rounded-md border transition-colors outline-none after:absolute after:-inset-[5px] after:content-[''] focus-visible:ring-[3px]"
					>
						<action.icon size={16} aria-hidden="true" />
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if switcher && current}
		<HouseholdSwitcher all={households.all} {current} />
	{/if}
</header>
