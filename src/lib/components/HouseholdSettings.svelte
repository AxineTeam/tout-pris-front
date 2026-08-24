<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		deleteHousehold,
		removeMember,
		renameHousehold,
		type Household,
		type Member
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { households } from '$lib/households.svelte.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		members,
		onchanged
	}: { household: Household; members: Member[]; onchanged: () => void } = $props();

	const submission = new Submission();
	let renamed = $derived(household.name);

	let me = $derived(session.user?.id ?? null);
	let mine = $derived(members.find((member) => member.user === me));
	let iAmOwner = $derived(mine?.role === 'owner');
	let owners = $derived(members.filter((member) => member.role === 'owner').length);
	let alone = $derived(members.length === 1);
	let lastOwner = $derived(iAmOwner && owners === 1 && !alone);
	let canRename = $derived(renamed.trim().length > 0 && renamed.trim() !== household.name);

	function leave() {
		if (!mine) return;
		const membership = mine.id;
		submission.run(async () => {
			await removeMember(household.id, membership);
			return away();
		});
	}

	function remove() {
		submission.run(async () => {
			await deleteHousehold(household.id);
			return away();
		});
	}

	async function away() {
		households.drop(household.id);
		const landing = households.landing;
		if (landing) await goto(resolve('/(app)/households/[id]', { id: String(landing.id) }));
		return [];
	}

	function rename(event: SubmitEvent) {
		event.preventDefault();
		if (!canRename) return;
		const name = renamed.trim();
		submission.run(async () => {
			households.replace(await renameHousehold(household.id, name));
			onchanged();
			return [];
		});
	}
</script>

<div class="grid gap-4">
	<FormErrors errors={submission.errors} />

	{#if iAmOwner}
		<form class="flex items-end gap-3" onsubmit={rename}>
			<div class="grid flex-1 gap-2">
				<Label for="household-name">Nom du foyer</Label>
				<Input id="household-name" bind:value={renamed} />
			</div>
			<Button type="submit" disabled={!canRename || submission.busy}>Renommer</Button>
		</form>
	{/if}

	<div class="flex flex-wrap gap-2">
		{#if alone}
			<p class="text-muted-foreground text-sm" data-testid="alone">
				Tu es le seul membre : ce foyer se supprime, il ne se quitte pas.
			</p>
		{:else}
			<Button variant="outline" onclick={leave} disabled={submission.busy || lastOwner}>
				Quitter ce foyer
			</Button>
			{#if lastOwner}
				<p class="text-muted-foreground text-sm" data-testid="last-owner">
					Tu es le dernier propriétaire : nomme quelqu’un d’autre avant de partir.
				</p>
			{/if}
		{/if}
		{#if iAmOwner}
			<Button variant="destructive" onclick={remove} disabled={submission.busy}>
				Supprimer ce foyer
			</Button>
		{/if}
	</div>
</div>
