<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Household } from '$lib/api.js';
	import { householdLabel } from '$lib/households.svelte.js';

	let { all, current }: { all: Household[]; current: Household } = $props();
</script>

<nav aria-label="Foyers" class="flex flex-wrap items-center gap-2">
	{#each all as household (household.id)}
		<a
			href={resolve('/(app)/households/[id]', { id: String(household.id) })}
			aria-current={household.id === current.id ? 'page' : undefined}
			class="rounded-md border px-3 py-1 text-sm aria-[current=page]:bg-muted aria-[current=page]:font-medium"
		>
			{householdLabel(household)}
		</a>
	{/each}
</nav>
