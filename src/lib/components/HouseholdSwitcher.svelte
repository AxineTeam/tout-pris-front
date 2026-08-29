<script lang="ts">
	import { resolve } from '$app/paths';
	import { type Household } from '$lib/api.js';
	import HouseholdCreation from '$lib/components/HouseholdCreation.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { householdLabel } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';

	let { all, current }: { all: Household[]; current: Household } = $props();

	let creating = $state(false);
</script>

<div class="grid gap-2">
	<nav aria-label={m.households_nav()} class="flex flex-wrap items-center gap-2">
		{#each all as household (household.id)}
			<a
				href={resolve('/(app)/households/[id]', { id: String(household.id) })}
				aria-current={household.id === current.id ? 'page' : undefined}
				class="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground border-b-2 border-transparent px-1 py-1 text-sm aria-[current=page]:font-medium"
			>
				{householdLabel(household)}
			</a>
		{/each}
		{#if !creating}
			<Button variant="ghost" size="sm" onclick={() => (creating = true)}
				>{m.household_new()}</Button
			>
		{/if}
	</nav>

	{#if creating}
		<HouseholdCreation oncancel={() => (creating = false)} />
	{/if}
</div>
