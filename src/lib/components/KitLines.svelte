<script lang="ts">
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
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
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemEditor from '$lib/components/ItemEditor.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Reordering, rerank } from '$lib/reorder.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	interface Grouped {
		id: number;
		item: ItemType;
		lines: KitItem[];
	}

	type Opened =
		| { kind: 'edit'; group: Grouped }
		| { kind: 'remove-line'; group: Grouped; line: KitItem }
		| { kind: 'remove-item'; group: Grouped };

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
	let opened = $state.raw<Opened | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let fading: ReturnType<typeof setTimeout>;
	let container = $state.raw<HTMLElement>();

	function anchored(node: HTMLElement) {
		container = node;
	}

	let groups = $derived.by(() => {
		const found: Grouped[] = [];
		for (const line of kit.items) {
			const group = found.find((known) => known.item.id === line.item_type.id);
			if (group) group.lines.push(line);
			else found.push({ id: line.item_type.id, item: line.item_type, lines: [line] });
		}
		return found;
	});

	let held = $derived(groups.map((group) => group.item.id));
	let searching = $derived(typed.trim().length > 0);

	function whoever(person: Person | null): string {
		return person ? person.name : m.everyone();
	}

	function missing(group: Grouped): (Person | null)[] {
		const taken = group.lines.map((line) => line.person?.id ?? null);
		return [null, ...persons].filter((person) => !taken.includes(person?.id ?? null));
	}

	function act(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			opened = null;
			await onchanged();
			return [];
		});
	}

	async function chosen(item: ItemType) {
		if (held.includes(item.id)) {
			clearTimeout(fading);
			highlighted = item.id;
			fading = setTimeout(() => (highlighted = null), 2500);
			await tick();
			container?.querySelector(`[data-row="${item.id}"]`)?.scrollIntoView({ block: 'nearest' });
			return;
		}
		addLine(item.id, null);
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
		const wanted = dragging.rows.flatMap((group) => group.lines);
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
	<ItemPicker
		{household}
		{items}
		{held}
		holding={m.item_in_kit()}
		busy={stepping.busy}
		bind:typed
		onchosen={chosen}
	/>

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
				{@const absent = missing(group)}
				<li
					data-row={group.id}
					style:transform={dragging.grabbed?.id === group.id
						? `translateY(${dragging.offset}px)`
						: undefined}
					class={[
						'border-border bg-card grid min-w-0 gap-1 rounded-xl border py-1 pr-3 pl-1 transition-colors',
						(highlighted === group.id || dragging.grabbed?.id === group.id) &&
							'border-primary bg-accent',
						dragging.grabbed?.id === group.id && 'relative z-10 shadow-lg'
					]}
				>
					<div class="flex min-w-0 items-center gap-1">
						<span
							aria-hidden="true"
							data-testid="kit-item-handle-{group.id}"
							onpointerdown={(event) => !stepping.busy && dragging.grab(event, group)}
							class="text-muted-foreground -ml-1 flex size-11 flex-none touch-none items-center justify-center"
						>
							<GripHorizontalIcon size={16} />
						</span>
						<div class="grid min-h-11 min-w-0 flex-1 content-center pr-2">
							<span data-testid="kit-item-name" class="truncate text-sm font-semibold">
								{group.item.name}
							</span>
							{#if group.item.description}
								<span class="text-muted-foreground truncate text-xs">
									{group.item.description}
								</span>
							{/if}
						</div>
						<Button
							variant="ghost"
							size="icon"
							aria-label={m.item_edit({ name: group.item.name })}
							onclick={() => editItem(group)}
							class="text-muted-foreground size-11 flex-none"
						>
							<PencilIcon class="size-[15px]" aria-hidden="true" />
						</Button>
					</div>

					<ul class="ml-10 grid min-w-0">
						{#each group.lines as line (line.id)}
							<li class="border-border/60 flex min-h-11 min-w-0 items-center gap-2 border-t">
								<PersonAvatar person={line.person} small />
								<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">
									{whoever(line.person)}
								</span>
								<QuantityStepper
									quantity={line.quantity}
									less={m.kit_quantity_less({ who: whoever(line.person) })}
									more={m.kit_quantity_more({ who: whoever(line.person) })}
									busy={stepping.busy}
									onless={() =>
										line.quantity > 1
											? step(line, -1)
											: (opened = { kind: 'remove-line', group, line })}
									onmore={() => step(line, 1)}
								/>
							</li>
						{/each}

						{#if absent.length > 0}
							<li
								class="border-border/60 flex min-h-11 min-w-0 flex-wrap items-center gap-x-1.5 border-t py-1"
							>
								<span class="text-muted-foreground flex-none pr-0.5 text-xs">
									{m.kit_line_add()}
								</span>
								{#each absent as person (person?.id ?? 'everyone')}
									<button
										type="button"
										aria-label={m.kit_line_add_for({ who: whoever(person) })}
										disabled={stepping.busy}
										onclick={() => addLine(group.item.id, person?.id ?? null)}
										class="hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 min-w-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 opacity-60 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:opacity-40"
									>
										<PersonAvatar {person} small />
										<span class="truncate text-xs font-medium">{whoever(person)}</span>
									</button>
								{/each}
							</li>
						{/if}
					</ul>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if opened?.kind === 'edit'}
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
			onclick={() => act(() => deleteKitItem(household, kit.id, line.id))}
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
				act(() =>
					Promise.all(group.lines.map((line) => deleteKitItem(household, kit.id, line.id)))
				)}
		>
			{m.delete_it()}
		</Button>
	</Modal>
{/if}
