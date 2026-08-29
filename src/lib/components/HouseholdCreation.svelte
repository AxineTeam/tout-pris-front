<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createHousehold } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { households } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { oncancel }: { oncancel?: () => void } = $props();

	const submission = new Submission();
	let name = $state('');
	let canCreate = $derived(name.trim().length > 0 && !submission.busy);

	function create(event: SubmitEvent) {
		event.preventDefault();
		if (!canCreate) return;
		const wanted = name.trim();
		submission.run(async () => {
			const created = await createHousehold(wanted);
			households.add(created);
			name = '';
			oncancel?.();
			await goto(resolve('/(app)/households/[id]', { id: String(created.id) }));
			return [];
		});
	}
</script>

<div class="grid gap-2">
	<FormErrors errors={submission.errors} />

	<form class="flex flex-wrap items-end gap-3" onsubmit={create}>
		<div class="grid min-w-40 flex-1 gap-2">
			<Label for="new-household">{m.household_new_label()}</Label>
			<Input id="new-household" bind:value={name} />
		</div>
		<Button type="submit" disabled={!canCreate}>{m.create()}</Button>
		{#if oncancel}
			<Button variant="ghost" onclick={oncancel}>{m.cancel()}</Button>
		{/if}
	</form>
</div>
