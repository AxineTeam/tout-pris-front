<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { deleteKit, updateKit, type KitDetail, type Person } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import KitLines from '$lib/components/KitLines.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		kit,
		persons,
		onchanged,
		onremoved
	}: {
		household: number;
		kit: KitDetail;
		persons: Person[];
		onchanged: () => Promise<void>;
		onremoved: () => void;
	} = $props();

	const submission = new Submission();
	let opened = $state.raw<'edit' | 'remove' | null>(null);
	let named = $state('');
	let described = $state('');

	let back = $derived(resolve('/(app)/households/[id]/kits', { id: String(household) }));

	function open(next: 'edit' | 'remove') {
		submission.errors = [];
		named = kit.name;
		described = kit.description;
		opened = next;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		const name = named.trim();
		if (!name) return;
		submission.run(async () => {
			await updateKit(household, kit.id, { name, description: described.trim() });
			opened = null;
			await onchanged();
			return [];
		});
	}

	function remove() {
		submission.run(async () => {
			await deleteKit(household, kit.id);
			onremoved();
			await goto(resolve('/(app)/households/[id]/kits', { id: String(household) }));
			return [];
		});
	}
</script>

<ScreenHeader
	title={kit.name}
	subtitle={kit.description || undefined}
	{back}
	actions={[{ label: m.kit_edit(), icon: PencilIcon, onclick: () => open('edit') }]}
/>

<KitLines {household} {kit} {persons} {onchanged} />

{#if opened === 'edit'}
	<Modal title={m.kit_edit_title({ name: kit.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={save}>
			<div class="grid gap-2">
				<Label for="kit-name">{m.kit_name_label()}</Label>
				<Input id="kit-name" bind:value={named} />
			</div>
			<div class="grid gap-2">
				<Label for="kit-description">{m.kit_description_label()}</Label>
				<Input id="kit-description" bind:value={described} />
			</div>
			<Button type="submit" disabled={submission.busy || named.trim().length === 0}>
				{m.save()}
			</Button>
		</form>
		<Button variant="outline" disabled={submission.busy} onclick={() => open('remove')}>
			{m.kit_delete()}
		</Button>
	</Modal>
{:else if opened === 'remove'}
	<Modal title={m.kit_delete_title({ name: kit.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm" data-testid="kit-fallout">{m.kit_delete_explains()}</p>
		<Button variant="destructive" disabled={submission.busy} onclick={remove}
			>{m.delete_it()}</Button
		>
	</Modal>
{/if}
