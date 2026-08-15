<script lang="ts">
	import { createStuffList, deleteStuffList, listStuffLists, type StuffList } from '$lib/api.js';
	import StuffListRow from '$lib/components/StuffListRow.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let stufflists = $state<StuffList[]>([]);
	let newName = $state('');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let canCreate = $derived(newName.trim().length > 0);

	async function refresh() {
		try {
			stufflists = await listStuffLists();
			error = null;
		} catch {
			error = 'Impossible de joindre le backend.';
		} finally {
			loading = false;
		}
	}

	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (!canCreate) return;
		try {
			const created = await createStuffList({ name: newName.trim() });
			stufflists = [...stufflists, created];
			newName = '';
			error = null;
		} catch {
			error = 'La création a échoué.';
		}
	}

	async function remove(id: number) {
		try {
			await deleteStuffList(id);
			stufflists = stufflists.filter((s) => s.id !== id);
			error = null;
		} catch {
			error = 'La suppression a échoué.';
		}
	}

	$effect(() => {
		refresh();
	});
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Nouvelle liste</Card.Title>
			<Card.Description>Créer une stufflist dans le backend Tout Pris.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form class="flex items-end gap-3" onsubmit={create}>
				<div class="grid flex-1 gap-2">
					<Label for="stufflist-name">Nom</Label>
					<Input id="stufflist-name" placeholder="Courses de la semaine" bind:value={newName} />
				</div>
				<Button type="submit" disabled={!canCreate}>Créer</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if error}
		<Alert.Root variant="destructive">
			<Alert.Title>Erreur</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<section aria-label="Listes">
		{#if loading}
			<p class="text-muted-foreground">Chargement…</p>
		{:else if stufflists.length === 0}
			<p class="text-muted-foreground">Aucune liste pour le moment.</p>
		{:else}
			<ul class="space-y-2">
				{#each stufflists as stufflist (stufflist.id)}
					<StuffListRow {stufflist} ondelete={remove} />
				{/each}
			</ul>
		{/if}
	</section>
</div>
