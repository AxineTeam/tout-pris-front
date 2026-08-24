<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createHousehold, type Household } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { households, householdLabel } from '$lib/households.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { all, current }: { all: Household[]; current: Household } = $props();

	const submission = new Submission();
	let creating = $state(false);
	let name = $state('');
	let canCreate = $derived(name.trim().length > 0 && !submission.busy);

	function create(event: SubmitEvent) {
		event.preventDefault();
		if (!canCreate) return;
		const wanted = name.trim();
		submission.run(async () => {
			const created = await createHousehold(wanted);
			households.add(created);
			creating = false;
			name = '';
			await goto(resolve('/(app)/households/[id]', { id: String(created.id) }));
			return [];
		});
	}
</script>

<div class="grid gap-2">
	<nav aria-label="Foyers" class="flex flex-wrap items-center gap-2">
		{#each all as household (household.id)}
			<a
				href={resolve('/(app)/households/[id]', { id: String(household.id) })}
				aria-current={household.id === current.id ? 'page' : undefined}
				class="aria-[current=page]:bg-muted rounded-md border px-3 py-1 text-sm aria-[current=page]:font-medium"
			>
				{householdLabel(household)}
			</a>
		{/each}
		{#if !creating}
			<Button variant="ghost" size="sm" onclick={() => (creating = true)}>Nouveau foyer</Button>
		{/if}
	</nav>

	<FormErrors errors={submission.errors} />

	{#if creating}
		<form class="flex items-end gap-3" onsubmit={create}>
			<div class="grid flex-1 gap-2">
				<Label for="new-household">Nom du nouveau foyer</Label>
				<Input id="new-household" bind:value={name} />
			</div>
			<Button type="submit" disabled={!canCreate}>Créer</Button>
			<Button variant="ghost" onclick={() => (creating = false)}>Annuler</Button>
		</form>
	{/if}
</div>
