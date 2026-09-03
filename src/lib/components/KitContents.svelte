<script lang="ts">
	import CopyIcon from '@lucide/svelte/icons/copy';
	import FolderInputIcon from '@lucide/svelte/icons/folder-input';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		deleteKit,
		updateKit,
		type Household,
		type ItemType,
		type KitDetail,
		type Person
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import KitCopy from '$lib/components/KitCopy.svelte';
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
		households,
		kit,
		persons,
		items,
		onchanged,
		onremoved
	}: {
		household: number;
		households: Household[];
		kit: KitDetail;
		persons: Person[];
		items: ItemType[];
		onchanged: () => Promise<void>;
		onremoved: () => void;
	} = $props();

	const submission = new Submission();
	let opened = $state.raw<'edit' | 'copy' | 'move' | 'remove' | null>(null);
	let named = $state('');
	let described = $state('');
	// The screen this box sits on is the moved kit's: taking it away while the
	// recap is still open would take the recap with it. So the departure waits
	// for whichever comes last, the deletion or the closing.
	let gone = false;

	let back = $derived(resolve('/(app)/households/[id]/kits', { id: String(household) }));

	function open(next: 'edit' | 'copy' | 'move' | 'remove') {
		submission.errors = [];
		named = kit.name;
		described = kit.description;
		opened = next;
	}

	async function backToKits() {
		onremoved();
		await goto(resolve('/(app)/households/[id]/kits', { id: String(household) }));
	}

	function moved() {
		gone = true;
		if (opened === null) void backToKits();
	}

	function closeBox() {
		opened = null;
		if (gone) void backToKits();
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
			await backToKits();
			return [];
		});
	}
</script>

<ScreenHeader
	title={kit.name}
	subtitle={kit.description || undefined}
	{back}
	actions={[
		{ label: m.kit_edit(), icon: PencilIcon, onclick: () => open('edit') },
		{ label: m.kit_copy(), icon: CopyIcon, onclick: () => open('copy') },
		{ label: m.kit_move(), icon: FolderInputIcon, onclick: () => open('move') }
	]}
/>

<KitLines {household} {kit} {persons} {items} {onchanged} />

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
{:else if opened === 'copy' || opened === 'move'}
	<KitCopy {household} {households} {kit} mode={opened} onmoved={moved} onclose={closeBox} />
{:else if opened === 'remove'}
	<Modal title={m.kit_delete_title({ name: kit.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm" data-testid="kit-fallout">{m.kit_delete_explains()}</p>
		<Button variant="destructive" disabled={submission.busy} onclick={remove}
			>{m.delete_it()}</Button
		>
	</Modal>
{/if}
