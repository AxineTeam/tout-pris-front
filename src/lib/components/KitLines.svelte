<script lang="ts">
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import {
		createKitItem,
		deleteKitItem,
		updateItemType,
		updateKitItem,
		type ItemType,
		type KitDetail,
		type KitItem,
		type Person
	} from '$lib/api.js';
	import { catalog } from '$lib/catalog.svelte.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Reordering } from '$lib/reorder.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	interface Grouped {
		id: number;
		item: ItemType;
		lines: KitItem[];
	}

	type Opened =
		| { kind: 'add'; item: ItemType }
		| { kind: 'edit'; group: Grouped }
		| { kind: 'remove-line'; group: Grouped; line: KitItem }
		| { kind: 'remove-item'; group: Grouped };

	let {
		household,
		kit,
		persons,
		onchanged
	}: {
		household: number;
		kit: KitDetail;
		persons: Person[];
		onchanged: () => Promise<void>;
	} = $props();

	const submission = new Submission();
	const stepping = new Submission();
	const dragging = new Reordering(() => groups);
	let typed = $state('');
	let opened = $state.raw<Opened | null>(null);
	let named = $state('');
	let described = $state('');
	let merged = $state.raw<{ asked: string; name: string } | null>(null);
	let counted = $state(1);
	let aimed = $state.raw<number | null>(null);
	let highlighted = $state.raw<number | null>(null);
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
		return person ? person.name : m.kit_everyone();
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
			highlighted = item.id;
			setTimeout(() => (highlighted = null), 2500);
			await tick();
			container?.querySelector(`[data-row="${item.id}"]`)?.scrollIntoView({ block: 'nearest' });
			return;
		}
		submission.errors = [];
		named = item.name;
		described = item.description;
		counted = 1;
		aimed = null;
		opened = { kind: 'add', item };
	}

	async function describe(item: ItemType) {
		const description = described.trim();
		if (description === item.description) return;
		catalog.remember(await updateItemType(household, item.id, { description }));
	}

	async function rename(item: ItemType) {
		const name = named.trim();
		if (name === item.name) {
			await describe(item);
			return;
		}
		const description = described.trim();
		const rewritten = description === item.description ? {} : { description };
		const survivor = await updateItemType(household, item.id, { name, ...rewritten });
		catalog.remember(survivor);
		if (survivor.id === item.id) return;
		catalog.forget(item.id);
		merged = { asked: name, name: survivor.name };
		// A merge answers with the survivor before the description is applied.
		if (rewritten.description !== undefined) {
			catalog.remember(await updateItemType(household, survivor.id, rewritten));
		}
	}

	function add(event: SubmitEvent, item: ItemType) {
		event.preventDefault();
		act(async () => {
			await describe(item);
			await createKitItem(household, kit.id, {
				item_type: item.id,
				person: aimed,
				quantity: counted
			});
		});
	}

	function editItem(group: Grouped) {
		submission.errors = [];
		merged = null;
		named = group.item.name;
		described = group.item.description;
		opened = { kind: 'edit', group };
	}

	function save(event: SubmitEvent, item: ItemType) {
		event.preventDefault();
		if (!named.trim()) return;
		act(() => rename(item));
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
			const current = [...kit.items];
			try {
				for (const [at, line] of wanted.entries()) {
					if (current[at]?.id === line.id) continue;
					await updateKitItem(household, kit.id, line.id, { position: at });
					current.splice(
						current.findIndex((known) => known.id === line.id),
						1
					);
					current.splice(at, 0, line);
				}
			} catch (refusal) {
				dragging.forget();
				await onchanged();
				throw refusal;
			}
			await onchanged();
			return [];
		});
	}

	function addFor(group: Grouped, person: Person | null) {
		stepping.run(async () => {
			await createKitItem(household, kit.id, {
				item_type: group.item.id,
				person: person?.id ?? null
			});
			await onchanged();
			return [];
		});
	}
</script>

{#snippet face(person: Person | null)}
	{#if person}
		<PersonAvatar id={person.id} name={person.name} small />
	{:else}
		<span
			aria-hidden="true"
			class="bg-muted-foreground text-avatar-foreground flex size-7 flex-none items-center justify-center rounded-full text-xs font-semibold"
		>
			∗
		</span>
	{/if}
{/snippet}

<svelte:window
	onpointermove={(event) => dragging.drag(event)}
	onpointerup={drop}
	onpointercancel={() => dragging.cancel()}
/>

<div {@attach anchored} class="grid gap-4">
	<ItemPicker {household} {held} bind:typed onchosen={chosen} />

	<FormErrors errors={stepping.errors} />

	{#if merged}
		<p class="text-muted-foreground text-xs" data-testid="item-merged">{m.item_merged(merged)}</p>
	{/if}

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
							onpointerdown={(event) => dragging.grab(event, group)}
							class="text-muted-foreground -ml-1 flex size-11 flex-none touch-none items-center justify-center"
						>
							<GripHorizontalIcon size={16} />
						</span>
						<button
							type="button"
							aria-label={m.kit_item_edit({ name: group.item.name })}
							onclick={() => editItem(group)}
							class="focus-visible:ring-ring/50 grid min-h-11 min-w-0 flex-1 content-center rounded-md pr-2 text-left outline-none focus-visible:ring-[3px]"
						>
							<span class="truncate text-sm font-semibold">{group.item.name}</span>
							{#if group.item.description}
								<span class="text-muted-foreground truncate text-xs">
									{group.item.description}
								</span>
							{/if}
						</button>
					</div>

					<ul class="ml-10 grid min-w-0">
						{#each group.lines as line (line.id)}
							<li class="border-border/60 flex min-h-11 min-w-0 items-center gap-2 border-t">
								{@render face(line.person)}
								<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">
									{whoever(line.person)}
								</span>
								<span class="border-border flex flex-none items-center rounded-lg border">
									<Button
										variant="ghost"
										size="icon"
										aria-label={m.kit_quantity_less({ who: whoever(line.person) })}
										disabled={stepping.busy}
										onclick={() =>
											line.quantity > 1
												? step(line, -1)
												: (opened = { kind: 'remove-line', group, line })}
										class="text-primary size-11 rounded-r-none"
									>
										<MinusIcon class="size-[15px]" aria-hidden="true" />
									</Button>
									<span class="min-w-6 text-center text-[13px] font-semibold">{line.quantity}</span>
									<Button
										variant="ghost"
										size="icon"
										aria-label={m.kit_quantity_more({ who: whoever(line.person) })}
										disabled={stepping.busy}
										onclick={() => step(line, 1)}
										class="text-primary size-11 rounded-l-none"
									>
										<PlusIcon class="size-[15px]" aria-hidden="true" />
									</Button>
								</span>
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
										onclick={() => addFor(group, person)}
										class="hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 min-w-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 opacity-60 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:opacity-40"
									>
										{@render face(person)}
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

{#snippet quantity()}
	<div class="grid gap-2">
		<Label for="kit-quantity">{m.kit_quantity_label()}</Label>
		<Input id="kit-quantity" type="number" min="1" bind:value={counted} />
	</div>
{/snippet}

{#snippet description()}
	<div class="grid gap-2">
		<Label for="item-description">{m.item_description_label()}</Label>
		<Input id="item-description" bind:value={described} aria-describedby="item-description-scope" />
		<p id="item-description-scope" class="text-muted-foreground text-xs">
			{m.item_description_hint()}
		</p>
	</div>
{/snippet}

{#if opened?.kind === 'add'}
	{@const item = opened.item}
	<Modal title={m.kit_add_title({ name: item.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={(event) => add(event, item)}>
			<div class="grid gap-2">
				<span class="text-sm leading-none font-medium">{m.kit_for_whom()}</span>
				<div role="group" aria-label={m.kit_for_whom()} class="flex flex-wrap gap-1.5">
					{#each [null, ...persons] as person (person?.id ?? 'everyone')}
						<button
							type="button"
							aria-pressed={aimed === (person?.id ?? null)}
							onclick={() => (aimed = person?.id ?? null)}
							class="border-border aria-pressed:border-primary aria-pressed:bg-accent hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 items-center gap-2 rounded-full border px-1.5 py-1 pr-3 text-sm transition-colors outline-none focus-visible:ring-[3px]"
						>
							{@render face(person)}
							{whoever(person)}
						</button>
					{/each}
				</div>
			</div>
			{@render description()}
			{@render quantity()}
			<Button type="submit" disabled={submission.busy || counted < 1}>{m.add()}</Button>
		</form>
	</Modal>
{:else if opened?.kind === 'edit'}
	{@const group = opened.group}
	<Modal title={group.item.name} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={(event) => save(event, group.item)}>
			<div class="grid gap-2">
				<Label for="item-name">{m.item_name_label()}</Label>
				<Input id="item-name" bind:value={named} />
			</div>
			{@render description()}
			<Button type="submit" disabled={submission.busy || named.trim().length === 0}>
				{m.save()}
			</Button>
		</form>
		<Button
			variant="outline"
			disabled={submission.busy}
			onclick={() => (opened = { kind: 'remove-item', group })}
		>
			{m.kit_item_remove()}
		</Button>
	</Modal>
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
