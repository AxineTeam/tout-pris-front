<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { updateItemType, type ItemType } from '$lib/api.js';
	import { remember, rewriteItems } from '$lib/catalog.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	// An object belongs to the household, not to the kit or the trip showing it,
	// so both screens rename it the same way — including the merge a rename onto
	// an existing name performs, which is the part worth writing only once.
	let {
		household,
		item,
		extra,
		onclose,
		onsaved
	}: {
		household: number;
		item: ItemType;
		extra?: Snippet;
		onclose: () => void;
		onsaved: (survivor: ItemType) => Promise<void>;
	} = $props();

	const submission = new Submission();
	// Seeded once: a background refetch must not wipe out what is being typed.
	let named = $state(untrack(() => item.name));
	let described = $state(untrack(() => item.description));

	async function describe(): Promise<ItemType> {
		const description = described.trim();
		if (description === item.description) return item;
		const noted = await updateItemType(household, item.id, { description });
		rewriteItems(household, (all) => remember(all, noted));
		return noted;
	}

	// Every branch answers with the object as the server now holds it, never with
	// the one this form opened on: the caller puts it straight into the screens
	// that show it, and a copy that predates the write would put the old text
	// back on the very save that changed it.
	async function rename(): Promise<ItemType> {
		const name = named.trim();
		if (name === item.name) return describe();
		const description = described.trim();
		const rewritten = description === item.description ? {} : { description };
		const survivor = await updateItemType(household, item.id, { name, ...rewritten });
		rewriteItems(household, (all) => remember(all, survivor));
		if (survivor.id === item.id) return survivor;
		rewriteItems(household, (all) => all.filter((known) => known.id !== item.id));
		// A merge answers with the survivor before the description is applied.
		if (rewritten.description !== undefined) {
			const applied = await updateItemType(household, survivor.id, rewritten);
			rewriteItems(household, (all) => remember(all, applied));
			return applied;
		}
		return survivor;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!named.trim()) return;
		submission.run(async () => {
			await onsaved(await rename());
			onclose();
			return [];
		});
	}
</script>

<Modal title={item.name} {onclose}>
	<FormErrors errors={submission.errors} />

	<form class="grid gap-3.5" onsubmit={save}>
		<div class="grid gap-2">
			<Label for="item-name">{m.item_name_label()}</Label>
			<Input id="item-name" bind:value={named} />
		</div>
		<div class="grid gap-2">
			<Label for="item-description">{m.item_description_label()}</Label>
			<Input
				id="item-description"
				bind:value={described}
				aria-describedby="item-description-scope"
			/>
			<p id="item-description-scope" class="text-muted-foreground text-xs">
				{m.item_description_hint()}
			</p>
		</div>
		<Button type="submit" disabled={submission.busy || named.trim().length === 0}>
			{m.save()}
		</Button>
	</form>

	{@render extra?.()}
</Modal>
