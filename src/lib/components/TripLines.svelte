<script module lang="ts">
	export type Sorting = 'order' | 'name';
	export type Direction = 'up' | 'down';
</script>

<script lang="ts">
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { tick } from 'svelte';
	import {
		createTripItem,
		deleteTripItem,
		updateTripItem,
		type ItemType,
		type ItemStatus,
		type Kit,
		type Person,
		type TripItem
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemEditor from '$lib/components/ItemEditor.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import TripItemSheet from '$lib/components/TripItemSheet.svelte';
	import TripFilters from '$lib/components/TripFilters.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Reordering } from '$lib/reorder.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	interface Grouped {
		id: number;
		item: ItemType;
		kits: Kit[];
		lines: TripItem[];
	}

	let {
		household,
		trip,
		lines,
		participants,
		items,
		statuses,
		sorted = 'order',
		direction = 'up',
		onchanged
	}: {
		household: number;
		trip: number;
		lines: TripItem[];
		participants: Person[];
		items: ItemType[];
		statuses: ItemStatus[];
		sorted?: Sorting;
		direction?: Direction;
		onchanged: () => Promise<void>;
	} = $props();

	const stepping = new Submission();
	const dragging = new Reordering(() => groups);
	let typed = $state('');
	let kept = $state.raw<number | null>(null);
	let aimed = $state.raw<number | null>(null);
	let staged = $state.raw<number | null>(null);
	let removed = $state.raw<{ group: Grouped; line: TripItem } | null>(null);
	let opened = $state.raw<number | null>(null);
	// The editor replaces the sheet rather than stacking on it: two dialogs deep
	// is a trap on a phone, and closing the editor puts the sheet back.
	let editing = $state.raw<ItemType | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let container = $state.raw<HTMLElement>();

	function anchored(node: HTMLElement) {
		container = node;
	}

	// The kits a trip carries are the ones its own lines name: a household kit
	// nobody embarked would be a chip that empties the screen.
	let embarked = $derived.by(() => {
		const found: Kit[] = [];
		for (const line of lines) {
			for (const kit of line.kits) {
				if (!found.some((known) => known.id === kit.id)) found.push(kit);
			}
		}
		return found;
	});

	// A common line is everyone's, so it survives a filter on any one person:
	// what Léa has to pack includes what the household shares.
	let filtered = $derived(
		lines.filter(
			(line) =>
				(kept === null || line.kits.some((kit) => kit.id === kept)) &&
				(aimed === null || line.person === null || line.person.id === aimed) &&
				(staged === null || line.status.id === staged)
		)
	);

	// Same reading as the kits: the statuses a trip shows are the ones its lines
	// wear, in the household's own order.
	let worn = $derived.by(() => {
		const found: ItemStatus[] = [];
		for (const line of lines) {
			if (!found.some((known) => known.id === line.status.id)) found.push(line.status);
		}
		return found.sort((one, other) => one.position - other.position);
	});

	// A line carries a copy of its object, taken when the line was served. The
	// catalogue is where the object actually lives, so the name and the
	// description are read from there when it holds them: renaming an object
	// leaves every trip line untouched, and the lines route answers 304 on its
	// own fingerprint — the copy would stay stale until something else moved.
	function current(item: ItemType): ItemType {
		return items.find((known) => known.id === item.id) ?? item;
	}

	let groups = $derived.by(() => {
		const found: Grouped[] = [];
		for (const line of filtered) {
			const group = found.find((known) => known.id === line.item_type.id);
			if (group) group.lines.push(line);
			else
				found.push({
					id: line.item_type.id,
					item: current(line.item_type),
					kits: line.kits,
					lines: [line]
				});
		}
		return found;
	});

	// Read from every line, not from the visible groups: an object a filter hides
	// is still in the trip, and offering it again would create a second line.
	let held = $derived([...new Set(lines.map((line) => line.item_type.id))]);
	let searching = $derived(typed.trim().length > 0);

	// Dragging only makes sense against the whole list read the way it is stored:
	// reversed or sorted by name the gesture would fight the order, and under a
	// filter the ranks would be counted over the lines that show, moving the
	// hidden ones.
	let movable = $derived(
		sorted === 'order' && direction === 'up' && kept === null && aimed === null && staged === null
	);

	let shown = $derived.by(() => {
		const base =
			sorted === 'name'
				? [...groups].sort((one, other) => one.item.name.localeCompare(other.item.name))
				: movable
					? dragging.rows
					: groups;
		return direction === 'down' ? [...base].reverse() : base;
	});

	function whoever(person: Person | null): string {
		return person ? person.name : m.trip_everyone();
	}

	// Only the people going: a line aimed at someone who stayed home would be a
	// row nobody packs, and the API refuses it anyway. What is taken is read from
	// every line of the object, filtered ones included — a line a filter hides is
	// still a line, and offering it again would be a duplicate the API refuses.
	function missing(group: Grouped): (Person | null)[] {
		const taken = lines
			.filter((line) => line.item_type.id === group.id)
			.map((line) => line.person?.id ?? null);
		const offered = aimed === null ? participants : participants.filter((one) => one.id === aimed);
		return [null, ...offered].filter((person) => !taken.includes(person?.id ?? null));
	}

	function act(call: () => Promise<unknown>) {
		stepping.run(async () => {
			await call();
			removed = null;
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
		act(() => createTripItem(household, trip, { item_type: item.id, person: null }));
	}

	function step(line: TripItem, by: number) {
		act(() => updateTripItem(household, trip, line.id, { quantity: line.quantity + by }));
	}

	// Tapping walks the household's own order and wraps at the end, so a status
	// set by mistake is undone by tapping on rather than by hunting for a picker.
	function advance(line: TripItem) {
		const at = statuses.findIndex((one) => one.id === line.status.id);
		const next = statuses[(at + 1) % statuses.length];
		if (!next || next.id === line.status.id) return;
		act(() => updateTripItem(household, trip, line.id, { status: next.id }));
	}

	// The sheet reads from the same groups the list shows, so a change made
	// inside it lands on the screen behind without a second source of truth.
	let sheet = $derived(groups.find((group) => group.id === opened) ?? null);

	// A merge hands back the object that remains, and its lines are this trip's
	// lines: the sheet moves onto it rather than closing on an id that is gone.
	async function follow(survivor: ItemType) {
		await onchanged();
		opened = survivor.id;
	}

	function addFor(group: Grouped, person: Person | null) {
		act(() =>
			createTripItem(household, trip, { item_type: group.item.id, person: person?.id ?? null })
		);
	}

	// A position belongs to a line, not to the object above it, so moving one
	// card moves every line it holds. Only the lines whose rank actually changes
	// are sent, and the list is replayed locally to know which those are.
	function drop() {
		const move = dragging.drop();
		if (!move || move.to === move.from) return;
		const wanted = dragging.rows.flatMap((group) => group.lines);
		stepping.run(async () => {
			const current = [...lines];
			try {
				for (const [at, line] of wanted.entries()) {
					if (current[at]?.id === line.id) continue;
					await updateTripItem(household, trip, line.id, { position: at });
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
</script>

<svelte:window
	onpointermove={(event) => dragging.drag(event)}
	onpointerup={drop}
	onpointercancel={() => dragging.cancel()}
/>

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

<div {@attach anchored} class="grid gap-2.5">
	<ItemPicker {household} {items} {held} bind:typed onchosen={chosen} />

	<FormErrors errors={stepping.errors} />

	{#if !searching}
		<TripFilters
			kits={embarked}
			{participants}
			statuses={worn}
			bind:kit={kept}
			bind:person={aimed}
			bind:status={staged}
		/>

		{#if groups.length === 0}
			<p class="text-muted-foreground text-sm" data-testid="trip-empty">
				{lines.length === 0 ? m.trip_empty() : m.trip_filtered_empty()}
			</p>
		{/if}

		<ul
			{@attach dragging.anchored}
			class={['grid min-w-0 gap-2', dragging.grabbed && 'select-none']}
		>
			{#each shown as group (group.id)}
				{@const absent = missing(group)}
				<li
					data-row={group.id}
					data-trip-item={group.id}
					style:transform={dragging.grabbed?.id === group.id
						? `translateY(${dragging.offset}px)`
						: undefined}
					class={[
						'border-border bg-card grid min-w-0 gap-0.5 rounded-xl border pt-2 pr-3 pb-1 transition-colors',
						movable ? 'pl-1' : 'pl-3',
						(highlighted === group.id || dragging.grabbed?.id === group.id) &&
							'border-primary bg-accent',
						dragging.grabbed?.id === group.id && 'relative z-10 shadow-lg'
					]}
				>
					<div class="flex min-w-0 items-start gap-2">
						{#if movable}
							<span
								aria-hidden="true"
								data-testid="trip-item-handle-{group.id}"
								onpointerdown={(event) => dragging.grab(event, group)}
								class="text-muted-foreground -mt-1.5 -ml-1 flex size-11 flex-none touch-none items-center justify-center"
							>
								<GripHorizontalIcon size={16} />
							</span>
						{/if}
						<button
							type="button"
							aria-label={m.trip_item_open({ name: group.item.name })}
							onclick={() => (opened = group.id)}
							class="focus-visible:ring-ring/50 grid min-w-0 flex-1 content-center rounded-md text-left outline-none focus-visible:ring-[3px]"
						>
							<span class="flex min-w-0 items-center gap-0.5">
								<span class="truncate text-sm font-semibold">{group.item.name}</span>
								<ChevronRightIcon
									size={15}
									aria-hidden="true"
									class="text-muted-foreground flex-none"
								/>
							</span>
							{#if group.item.description}
								<span class="text-muted-foreground truncate text-xs">
									{group.item.description}
								</span>
							{/if}
						</button>
						{#if group.kits.length > 0}
							<span class="flex flex-none flex-wrap justify-end gap-1">
								{#each group.kits as kit (kit.id)}
									<span
										class="bg-accent text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
									>
										{kit.name}
									</span>
								{/each}
							</span>
						{/if}
					</div>

					<ul class="grid min-w-0">
						{#each group.lines as line (line.id)}
							<li class="border-border/60 flex min-h-11 min-w-0 items-center gap-2 border-t">
								{@render face(line.person)}
								<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">
									{whoever(line.person)}
								</span>
								<QuantityStepper
									quantity={line.quantity}
									less={m.trip_quantity_less({ who: whoever(line.person) })}
									more={m.trip_quantity_more({ who: whoever(line.person) })}
									busy={stepping.busy}
									onless={() => (line.quantity > 1 ? step(line, -1) : (removed = { group, line }))}
									onmore={() => step(line, 1)}
								/>
								<StatusPill
									status={line.status}
									label={m.trip_status_advance({
										name: group.item.name,
										who: whoever(line.person),
										status: line.status.name
									})}
									busy={stepping.busy}
									onadvance={() => advance(line)}
								/>
							</li>
						{/each}

						{#if absent.length > 0}
							<li
								class="border-border/60 flex min-h-11 min-w-0 flex-wrap items-center gap-x-1.5 border-t py-1"
							>
								<span class="text-muted-foreground flex-none pr-0.5 text-xs">
									{m.trip_line_add()}
								</span>
								{#each absent as person (person?.id ?? 'everyone')}
									<button
										type="button"
										aria-label={m.trip_line_add_for({ who: whoever(person) })}
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

{#if editing}
	<ItemEditor {household} item={editing} onclose={() => (editing = null)} onsaved={follow} />
{:else if sheet}
	<TripItemSheet
		item={sheet.item}
		kits={sheet.kits}
		lines={sheet.lines}
		absent={missing(sheet)}
		busy={stepping.busy}
		{whoever}
		onclose={() => (opened = null)}
		onadvance={advance}
		onstep={step}
		onremove={(line) => (removed = { group: sheet, line })}
		onadd={(person) => addFor(sheet, person)}
		onedit={() => (editing = sheet.item)}
	/>
{/if}

{#if removed}
	{@const { group, line } = removed}
	<Modal
		title={m.trip_line_remove_title({ name: group.item.name, who: whoever(line.person) })}
		onclose={() => (removed = null)}
	>
		<p class="text-muted-foreground text-sm">{m.trip_line_remove_explains()}</p>
		<FormErrors errors={stepping.errors} />
		<Button
			variant="destructive"
			disabled={stepping.busy}
			onclick={() => act(() => deleteTripItem(household, trip, line.id))}
		>
			{m.trip_line_remove()}
		</Button>
	</Modal>
{/if}
