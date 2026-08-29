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
	import { households, isOwner } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		members,
		onchanged
	}: { household: Household; members: Member[]; onchanged: () => void } = $props();

	const submission = new Submission();
	let renamed = $derived(household.name);

	let me = $derived(session.user?.id);
	let mine = $derived(members.find((member) => member.user === me));
	let iAmOwner = $derived(isOwner(members, me));
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
				<Label for="household-name">{m.household_name_label()}</Label>
				<Input id="household-name" bind:value={renamed} />
			</div>
			<Button type="submit" disabled={!canRename || submission.busy}>{m.rename()}</Button>
		</form>
	{/if}

	<div class="flex flex-wrap gap-2">
		{#if alone}
			<p class="text-muted-foreground text-sm" data-testid="alone">{m.household_alone()}</p>
		{:else}
			<Button variant="outline" onclick={leave} disabled={submission.busy || lastOwner}>
				{m.household_leave()}
			</Button>
			{#if lastOwner}
				<p class="text-muted-foreground text-sm" data-testid="last-owner">
					{m.household_last_owner()}
				</p>
			{/if}
		{/if}
		{#if iAmOwner}
			<Button variant="destructive" onclick={remove} disabled={submission.busy}>
				{m.household_delete()}
			</Button>
		{/if}
	</div>
</div>
