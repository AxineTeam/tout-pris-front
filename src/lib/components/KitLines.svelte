<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { tick } from 'svelte';
	import {
		createKitItem,
		deleteKitItem,
		updateKitItem,
		type ItemType,
		type KitDetail,
		type KitItem,
		type Person
	} from '$lib/api.js';
	import FiltersButton from '$lib/components/FiltersButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemEditor from '$lib/components/ItemEditor.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ObjectCard from '$lib/components/ObjectCard.svelte';
	import TripFilters from '$lib/components/TripFilters.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { orderAfterDrop, Reordering, rerank } from '$lib/reorder.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	interface Grouped {
		id: number;
		item: ItemType;
		lines: KitItem[];
	}

	type Opened =
		| { kind: 'edit'; group: Grouped }
		| { kind: 'remove-line'; group: Grouped; line: KitItem }
		| { kind: 'remove-item'; group: Grouped }
		| { kind: 'filters' };

	let {
		household,
		kit,
		persons,
		items,
		onchanged
	}: {
		household: number;
		kit: KitDetail;
		persons: Person[];
		items: ItemType[];
		onchanged: () => Promise<void>;
	} = $props();

	const submission = new Submission();
	const stepping = new Submission();
	const dragging = new Reordering(() => groups);
	let typed = $state('');
	let keptPeople = $state.raw<number[]>([]);
	let opened = $state.raw<Opened | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let addRowOn = $state.raw<number | null>(null);
	let fading: ReturnType<typeof setTimeout>;
	let container = $state.raw<HTMLElement>();
	let searchRow = $state.raw<HTMLElement>();
	let solePerson = $derived(persons.length === 1 ? persons[0].id : null);

	function anchored(node: HTMLElement) {
		container = node;
	}

	let peopleOnLines = $derived(
		persons.filter((person) => kit.items.some((line) => line.person?.id === person.id))
	);

	let filterable = $derived(peopleOnLines.length > 1);

	let chosenPeople = $derived(
		keptPeople.filter((id) => peopleOnLines.some((one) => one.id === id))
	);

	let filtered = $derived(
		kit.items.filter(
			(line) =>
				chosenPeople.length === 0 || line.person === null || chosenPeople.includes(line.person.id)
		)
	);

	let groups = $derived.by(() => {
		const found: Grouped[] = [];
		for (const line of filtered) {
			const group = found.find((known) => known.item.id === line.item_type.id);
			if (group) group.lines.push(line);
			else found.push({ id: line.item_type.id, item: line.item_type, lines: [line] });
		}
		return found;
	});

	let itemIdsInKit = $derived([...new Set(kit.items.map((line) => line.item_type.id))]);
	let searching = $derived(typed.trim().length > 0);

	function whoever(person: Person | null): string {
		return person ? person.name : m.everyone();
	}

	function whoeverWithoutLine(item: number): (Person | null)[] {
		const taken = kit.items
			.filter((line) => line.item_type.id === item)
			.map((line) => line.person?.id ?? null);
		const offered =
			chosenPeople.length === 0 ? persons : persons.filter((one) => chosenPeople.includes(one.id));
		return [null, ...offered].filter((person) => !taken.includes(person?.id ?? null));
	}

	function writeThenReload(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			opened = null;
			await onchanged();
			return [];
		});
	}

	// What empties a card's offer is not always a gesture this component sees —
	// the last line removed, the object put back — so the open add row is
	// reconciled against the kit rather than folded at each call site.
	$effect(() => {
		if (addRowOn === null) return;
		const carried = kit.items.some((line) => line.item_type.id === addRowOn);
		if (!carried || whoeverWithoutLine(addRowOn).length === 0) addRowOn = null;
	});

	async function chosen(item: ItemType) {
		if (itemIdsInKit.includes(item.id)) {
			const hiddenByFilters = !groups.some((group) => group.id === item.id);
			if (hiddenByFilters) keptPeople = [];
			clearTimeout(fading);
			highlighted = item.id;
			fading = setTimeout(() => (highlighted = null), 2500);
			await tick();
			const row = container?.querySelector<HTMLElement>(`[data-row="${item.id}"]`);
			if (!row || !searchRow) return;
			row.style.scrollMarginTop = `${searchRow.offsetHeight}px`;
			row.scrollIntoView({ block: 'nearest' });
			return;
		}
		addLine(item.id, solePerson);
	}

	function editItem(group: Grouped) {
		submission.errors = [];
		opened = { kind: 'edit', group };
	}

	function step(line: KitItem, by: number) {
		stepping.run(async () => {
			await updateKitItem(household, kit.id, line.id, { quantity: line.quantity + by });
			await onchanged();
			return [];
		});
	}

	function drop() {
		const move = dragging.drop();
		if (!move || move.to === move.from) return;
		const wanted = orderAfterDrop(
			dragging.rows,
			move.row.id,
			kit.items,
			(line) => line.item_type.id
		);
		stepping.run(async () => {
			try {
				await rerank(wanted, kit.items, (line, at) =>
					updateKitItem(household, kit.id, line.id, { position: at })
				);
			} catch (refusal) {
				dragging.forget();
				await onchanged();
				throw refusal;
			}
			await onchanged();
			return [];
		});
	}

	function addLine(item: number, person: number | null) {
		stepping.run(async () => {
			await createKitItem(household, kit.id, { item_type: item, person });
			await onchanged();
			return [];
		});
	}
</script>

<svelte:window
	onpointermove={(event) => dragging.drag(event)}
	onpointerup={drop}
	onpointercancel={() => dragging.cancel()}
/>

<div {@attach anchored} class="grid gap-2.5">
	<div
		bind:this={searchRow}
		class="bg-background sticky top-0 z-20 -mx-4 -my-2.5 flex items-start gap-2 px-4 py-2.5"
	>
		<div class="min-w-0 flex-1">
			<ItemPicker
				{household}
				{items}
				held={itemIdsInKit}
				holding={m.item_in_kit()}
				busy={stepping.busy}
				bind:typed
				onchosen={chosen}
				onadopt={(item) =>
					createKitItem(household, kit.id, { item_type: item.id, person: solePerson })}
				onrefresh={onchanged}
			/>
		</div>
		{#if !searching && filterable}
			<FiltersButton active={chosenPeople.length} onclick={() => (opened = { kind: 'filters' })} />
		{/if}
	</div>

	<FormErrors errors={stepping.errors} />

	{#if !searching}
		{#if groups.length === 0}
			<p class="text-muted-foreground text-sm" data-testid="kit-empty">{m.kit_empty()}</p>
		{/if}

		<ul
			{@attach dragging.anchored}
			class={['grid min-w-0 gap-2', dragging.grabbed && 'select-none']}
		>
			{#each dragging.rows as group (group.id)}
				<ObjectCard
					item={group.item}
					lines={group.lines}
					absent={whoeverWithoutLine(group.id)}
					{whoever}
					testid="kit-item"
					movable
					grabbed={dragging.grabbed?.id === group.id}
					offset={dragging.offset}
					highlighted={highlighted === group.id}
					unfolded={addRowOn === group.id}
					busy={stepping.busy}
					ongrab={(event) => dragging.grab(event, group)}
					onunfold={() => (addRowOn = addRowOn === group.id ? null : group.id)}
					onadd={(person) => addLine(group.item.id, person?.id ?? null)}
					onless={(line) =>
						line.quantity > 1 ? step(line, -1) : (opened = { kind: 'remove-line', group, line })}
					onmore={(line) => step(line, 1)}
				>
					{#snippet trailing()}
						<Button
							variant="ghost"
							size="icon"
							aria-label={m.item_edit({ name: group.item.name })}
							onclick={() => editItem(group)}
							class="text-muted-foreground relative size-8 flex-none after:absolute after:-inset-1.5 after:content-['']"
						>
							<PencilIcon class="size-[15px]" aria-hidden="true" />
						</Button>
					{/snippet}
				</ObjectCard>
			{/each}
		</ul>
	{/if}
</div>

{#if opened?.kind === 'filters'}
	<Modal title={m.trip_filters_open()} onclose={() => (opened = null)}>
		<TripFilters
			kits={[]}
			noKitOffered={false}
			participants={peopleOnLines}
			statuses={[]}
			bind:person={keptPeople}
		/>
	</Modal>
{:else if opened?.kind === 'edit'}
	{@const group = opened.group}
	<ItemEditor {household} item={group.item} onclose={() => (opened = null)} onsaved={onchanged}>
		{#snippet extra()}
			<Button variant="outline" onclick={() => (opened = { kind: 'remove-item', group })}>
				{m.kit_item_remove()}
			</Button>
		{/snippet}
	</ItemEditor>
{:else if opened?.kind === 'remove-line'}
	{@const group = opened.group}
	{@const line = opened.line}
	<Modal
		title={m.kit_line_remove_title({ name: group.item.name, who: whoever(line.person) })}
		onclose={() => (opened = null)}
	>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.kit_line_remove_explains()}</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => writeThenReload(() => deleteKitItem(household, kit.id, line.id))}
		>
			{m.delete_it()}
		</Button>
	</Modal>
{:else if opened?.kind === 'remove-item'}
	{@const group = opened.group}
	<Modal title={m.kit_item_remove_title({ name: group.item.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.kit_item_remove_explains()}</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() =>
				writeThenReload(() =>
					Promise.all(group.lines.map((line) => deleteKitItem(household, kit.id, line.id)))
				)}
		>
			{m.delete_it()}
		</Button>
	</Modal>
{/if}
