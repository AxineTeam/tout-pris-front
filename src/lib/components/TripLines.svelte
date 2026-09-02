<script module lang="ts">
	export type Sorting = 'order' | 'name';
	export type Direction = 'up' | 'down';
</script>

<script lang="ts">
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { tick } from 'svelte';
	import {
		createKitItem,
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
	import { kitsQuery, queryClient, tripLinesQuery } from '$lib/query.js';
	import { Reordering, rerank } from '$lib/reorder.svelte.js';
	import { inHierarchy } from '$lib/statuses.js';
	import { Submission } from '$lib/submission.svelte.js';

	type Opened =
		| { kind: 'sheet'; item: ItemType }
		| { kind: 'edit'; item: ItemType }
		| { kind: 'remove'; item: ItemType; line: TripItem; back: Opened | null };

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
		kits,
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
		kits: Kit[];
		statuses: ItemStatus[];
		sorted?: Sorting;
		direction?: Direction;
		onchanged: () => Promise<void>;
	} = $props();

	const stepping = new Submission();
	const dragging = new Reordering(() => groups);
	let typed = $state('');
	let kept = $state.raw<number[]>([]);
	let aimed = $state.raw<number[]>([]);
	let staged = $state.raw<number[]>([]);
	// One dialog at a time, held as one state: three flags side by side let two
	// of them be true at once, which is how a confirmation ends up stacked on the
	// sheet that raised it. A removal carries what it came from, so closing it
	// lands back on the sheet when there was one and on the list when there was
	// not.
	let opened = $state.raw<Opened | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let fading: ReturnType<typeof setTimeout>;
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

	// A row holds an or and the rows an and: what a reader picks inside one row
	// widens the list, what they pick in another narrows it. An empty row filters
	// nothing. A common line is everyone's, so it survives a filter on any set of
	// people: what Léa has to pack includes what the household shares.
	let filtered = $derived(
		lines.filter(
			(line) =>
				(kept.length === 0 || line.kits.some((kit) => kept.includes(kit.id))) &&
				(aimed.length === 0 || line.person === null || aimed.includes(line.person.id)) &&
				(staged.length === 0 || staged.includes(line.status.id))
		)
	);

	// Same reading as the kits: the statuses a trip shows are the ones its lines
	// wear, in the order the statuses screen lays them out.
	let worn = $derived.by(() => {
		const found: ItemStatus[] = [];
		for (const line of lines) {
			if (!found.some((known) => known.id === line.status.id)) found.push(line.status);
		}
		return inHierarchy(found);
	});

	let groups = $derived.by(() => {
		const found: Grouped[] = [];
		for (const line of filtered) {
			const group = found.find((known) => known.id === line.item_type.id);
			if (group) group.lines.push(line);
			else
				found.push({ id: line.item_type.id, item: line.item_type, kits: line.kits, lines: [line] });
		}
		return found;
	});

	// Read from every line, not from the visible groups: an object a filter hides
	// is still in the trip, and offering it again would create a second line.
	let held = $derived([...new Set(lines.map((line) => line.item_type.id))]);
	let searching = $derived(typed.trim().length > 0);

	// Dragging only makes sense against the stored order read forwards: sorted by
	// name or reversed, the gesture would fight the order. A filter is no
	// obstacle — the drop is resolved against every line, not the visible ones.
	let movable = $derived(sorted === 'order' && direction === 'up');

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
		return person ? person.name : m.everyone();
	}

	// Only the people going: a line aimed at someone who stayed home would be a
	// row nobody packs, and the API refuses it anyway. What is taken is read from
	// every line of the object, filtered ones included — a line a filter hides is
	// still a line, and offering it again would be a duplicate the API refuses.
	function missing(group: Grouped): (Person | null)[] {
		const taken = lines
			.filter((line) => line.item_type.id === group.id)
			.map((line) => line.person?.id ?? null);
		const offered =
			aimed.length === 0 ? participants : participants.filter((one) => aimed.includes(one.id));
		return [null, ...offered].filter((person) => !taken.includes(person?.id ?? null));
	}

	// After any write the dialog has to be re-examined, not left as it was: the
	// object it stands on may have lost its last line, and a dialog on an object
	// that is gone would reappear the day the object comes back.
	function settle() {
		const next = opened?.kind === 'remove' ? opened.back : opened;
		opened = next && lines.some((line) => line.item_type.id === next.item.id) ? next : null;
	}

	function act(call: () => Promise<unknown>) {
		stepping.run(async () => {
			await call();
			await onchanged();
			settle();
			return [];
		});
	}

	// Choosing an object the trip already carries points at it rather than adding
	// it twice. Under a filter that object may not be on screen at all, and a
	// scroll to a card that is not drawn would look like nothing happened — so
	// the filters are cleared first, putting the reader in front of what they
	// just asked for.
	async function chosen(item: ItemType) {
		if (!held.includes(item.id)) {
			act(() => createTripItem(household, trip, { item_type: item.id, person: null }));
			return;
		}
		if (!groups.some((group) => group.id === item.id)) {
			kept = [];
			aimed = [];
			staged = [];
		}
		clearTimeout(fading);
		highlighted = item.id;
		fading = setTimeout(() => (highlighted = null), 2500);
		await tick();
		container?.querySelector(`[data-row="${item.id}"]`)?.scrollIntoView({ block: 'nearest' });
	}

	function step(line: TripItem, by: number) {
		act(() => updateTripItem(household, trip, line.id, { quantity: line.quantity + by }));
	}

	let ranked = $derived(inHierarchy(statuses));

	// Tapping climbs the hierarchy the statuses screen shows and wraps at the
	// end, so a status set by mistake is undone by tapping on rather than by
	// hunting for a picker. A line whose status the household deleted while the
	// screen was open has no rank to climb from, and starts the cycle over.
	function advance(line: TripItem) {
		const at = ranked.findIndex((one) => one.id === line.status.id);
		const next = at === -1 ? ranked[0] : ranked[(at + 1) % ranked.length];
		if (!next || next.id === line.status.id) return;
		act(() => updateTripItem(household, trip, line.id, { status: next.id }));
	}

	// The sheet is the detail of one object, so it reads every line that object
	// has — not the groups the list shows. Reading the filtered groups would make
	// it close on the reader the moment a line it holds stopped matching, which
	// is exactly what advancing a status under a status filter does.
	let sheet = $derived.by(() => {
		const shown = opened;
		if (shown?.kind !== 'sheet') return null;
		const held = lines.filter((line) => line.item_type.id === shown.item.id);
		if (held.length === 0) return null;
		return { id: shown.item.id, item: held[0].item_type, kits: held[0].kits, lines: held };
	});

	// The write returned the object as it now stands, so it goes into the lines
	// that carry it rather than being asked for again. It is put there without
	// the invalidation `rewrite` would add: a rename touches no line, the lines
	// route answers on its own fingerprint, and the refetch would hand back a
	// body where the old name still stands — undoing what was just learnt.
	//
	// A merge is the one case the cache cannot settle alone, since lines move
	// between objects and some are dropped. There the lines do change, so the
	// fingerprint moves and asking again is both necessary and truthful.
	async function follow(survivor: ItemType) {
		const absorbed = survivor.id !== opened?.item.id;
		queryClient.setQueryData<TripItem[]>(tripLinesQuery(household, trip).queryKey, (all) =>
			(all ?? []).map((line) =>
				line.item_type.id === survivor.id ? { ...line, item_type: survivor } : line
			)
		);
		if (absorbed) await onchanged();
		opened = { kind: 'sheet', item: survivor };
	}

	// The kits served go into the lines that carry the object rather than being
	// asked for again: no trip line moved, so the lines route answers on the
	// same fingerprint, and the refetch would hand back a body where the object
	// belongs to no new kit — undoing what was just learnt and offering the same
	// kit a second time. They are written even when a refusal cuts the run
	// short, so that retrying resumes at the kit it stopped on.
	function addToKits(group: Grouped, wanted: Kit[]): Promise<boolean> {
		return stepping
			.run(async () => {
				const served: Kit[] = [];
				try {
					for (const kit of wanted) {
						for (const line of group.lines) {
							await createKitItem(household, kit.id, {
								item_type: group.item.id,
								person: line.person?.id ?? null,
								quantity: line.quantity
							});
						}
						served.push(kit);
					}
				} finally {
					if (served.length > 0) {
						queryClient.setQueryData<TripItem[]>(tripLinesQuery(household, trip).queryKey, (all) =>
							(all ?? []).map((line) =>
								line.item_type.id === group.item.id
									? {
											...line,
											kits: [...line.kits, ...served].sort(
												(one, other) => one.position - other.position
											)
										}
									: line
							)
						);
						// The kit screens read their own queries, where the kit would still
						// be the one that holds nothing. Waiting on that refetch would hold
						// the whole trip screen busy for a list this write did not change.
						void queryClient.invalidateQueries({ queryKey: kitsQuery(household).queryKey });
					}
				}
				return [];
			})
			.then(() => stepping.errors.length === 0);
	}

	function addFor(group: Grouped, person: Person | null) {
		act(() =>
			createTripItem(household, trip, { item_type: group.item.id, person: person?.id ?? null })
		);
	}

	// A position belongs to a line, not to the object above it, so moving one
	// card moves every line it holds. Only the lines whose rank actually changes
	// are sent, and the list is replayed locally to know which those are.
	//
	// The drop is read against every line, not the ones on screen: under a filter
	// the visible cards are islands in a longer list, and ranks counted over the
	// islands would drag the hidden lines between them. What the gesture states
	// is an order relative to its visible neighbours, so the moved object lands
	// just before the card that now follows it — or after the one it now trails.
	function landing(moved: Grouped): TripItem[] {
		const shownNow = dragging.rows;
		const at = shownNow.findIndex((group) => group.id === moved.id);
		const held = lines.filter((line) => line.item_type.id === moved.id);
		const rest = lines.filter((line) => line.item_type.id !== moved.id);
		const following = shownNow[at + 1];
		const index = following
			? rest.findIndex((line) => line.item_type.id === following.id)
			: rest.findLastIndex((line) => line.item_type.id === shownNow[at - 1]?.id) + 1;
		return [...rest.slice(0, index), ...held, ...rest.slice(index)];
	}

	function drop() {
		const move = dragging.drop();
		if (!move || move.to === move.from) return;
		const wanted = landing(move.row);
		stepping.run(async () => {
			try {
				await rerank(wanted, lines, (line, at) =>
					updateTripItem(household, trip, line.id, { position: at })
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
		holding={m.item_in_trip()}
		busy={stepping.busy}
		bind:typed
		onchosen={chosen}
	/>

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
								onpointerdown={(event) => !stepping.busy && dragging.grab(event, group)}
								class="text-muted-foreground -mt-1.5 -ml-1 flex size-11 flex-none touch-none items-center justify-center"
							>
								<GripHorizontalIcon size={16} />
							</span>
						{/if}
						<button
							type="button"
							aria-label={m.trip_item_open({ name: group.item.name })}
							onclick={() => (opened = { kind: 'sheet', item: group.item })}
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
								<PersonAvatar person={line.person} small />
								<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">
									{whoever(line.person)}
								</span>
								<QuantityStepper
									quantity={line.quantity}
									less={m.trip_quantity_less({ who: whoever(line.person) })}
									more={m.trip_quantity_more({ who: whoever(line.person) })}
									busy={stepping.busy}
									onless={() =>
										line.quantity > 1
											? step(line, -1)
											: (opened = { kind: 'remove', item: group.item, line, back: null })}
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
	{@const shownItem = opened.item}
	<ItemEditor
		{household}
		item={shownItem}
		onclose={() => {
			// Only a cancel puts this object's sheet back: a save has already moved
			// the state onto whatever the write answered with, which after a merge
			// is a different object entirely.
			if (opened?.kind === 'edit') opened = { kind: 'sheet', item: shownItem };
		}}
		onsaved={follow}
	/>
{:else if opened?.kind === 'remove'}
	{@const { item, line, back } = opened}
	<Modal
		title={m.trip_line_remove_title({ name: item.name, who: whoever(line.person) })}
		onclose={() => (opened = back)}
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
{:else if sheet}
	{@const shownSheet = sheet}
	<TripItemSheet
		item={shownSheet.item}
		kits={shownSheet.kits}
		offered={kits}
		lines={shownSheet.lines}
		absent={missing(shownSheet)}
		errors={stepping.errors}
		busy={stepping.busy}
		{whoever}
		onclose={() => (opened = null)}
		onadvance={advance}
		onstep={step}
		onremove={(line) => (opened = { kind: 'remove', item: shownSheet.item, line, back: opened })}
		onadd={(person) => addFor(shownSheet, person)}
		onedit={() => (opened = { kind: 'edit', item: shownSheet.item })}
		onpicking={() => (stepping.errors = [])}
		onaddtokits={(wanted) => addToKits(shownSheet, wanted)}
	/>
{/if}
