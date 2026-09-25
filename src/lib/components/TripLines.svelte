<script module lang="ts">
	export type Sorting = 'order' | 'name' | 'kit';
	export type Direction = 'up' | 'down';
</script>

<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import { onDestroy, tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { createMutation, useIsMutating } from '@tanstack/svelte-query';
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
	import DontAskAgain from '$lib/components/DontAskAgain.svelte';
	import FiltersButton from '$lib/components/FiltersButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemEditor from '$lib/components/ItemEditor.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ObjectCard from '$lib/components/ObjectCard.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import TripItemSheet from '$lib/components/TripItemSheet.svelte';
	import TripFilters, { NO_KIT } from '$lib/components/TripFilters.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { confirmations } from '$lib/confirmations.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { kitsQuery, queryClient, tripLinesQuery } from '$lib/query.js';
	import { orderAfterDrop, Reordering, rerank } from '$lib/reorder.svelte.js';
	import { inHierarchy } from '$lib/statuses.js';
	import { failure, Submission } from '$lib/submission.svelte.js';

	type Opened =
		| { kind: 'sheet'; item: ItemType }
		| { kind: 'edit'; item: ItemType }
		| { kind: 'remove'; item: ItemType; line: TripItem; back: Opened | null }
		| { kind: 'pick'; item: ItemType; line: TripItem; back: Opened | null }
		| { kind: 'filters' };

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
		onbusy,
		onfiltered,
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
		onbusy?: (busy: boolean) => void;
		onfiltered?: (lines: TripItem[]) => void;
		onchanged: () => Promise<void>;
	} = $props();

	const stepping = new Submission();
	const dragging = new Reordering(() => groups);
	let typed = $state('');
	let keptKits = $state.raw<number[]>([]);
	let keptPeople = $state.raw<number[]>([]);
	let keptStatuses = $state.raw<number[]>([]);
	// One dialog at a time, held as one state: three flags side by side let two
	// of them be true at once, which is how a confirmation ends up stacked on the
	// sheet that raised it.
	let opened = $state.raw<Opened | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let addRowOn = $state.raw<number | null>(null);
	let fading: ReturnType<typeof setTimeout>;
	let container = $state.raw<HTMLElement>();
	let searchRow = $state.raw<HTMLElement>();
	let stopAsking = $state(false);

	// The lines come from the query cache and are replaced at every poll, so a
	// hold lives here, by line id, rather than on the line. The status the line
	// wore when the hold began is what the filter matched, and it keeps that
	// status offered until the hold ends. One deadline covers the whole
	// register: a hold taken on any line pushes it back, so held lines leave
	// together instead of one at a time under a list that keeps shifting.
	// `graceRestarts` counts those pushes, which is what remounts every disc.
	const GRACE_MS = 4000;
	const graced = new SvelteMap<number, ItemStatus>();
	let graceRestarts = $state.raw(0);
	let leaving: ReturnType<typeof setTimeout> | undefined;

	function release(id: number) {
		if (!graced.delete(id)) return;
		if (graced.size === 0) releaseAll();
	}

	function releaseAll() {
		clearTimeout(leaving);
		leaving = undefined;
		graced.clear();
	}

	function grace(id: number, wore: ItemStatus) {
		graced.set(id, wore);
		clearTimeout(leaving);
		leaving = setTimeout(releaseAll, GRACE_MS);
		graceRestarts += 1;
	}

	// Only a line the filter was showing gets a grace: one hidden by a kit and
	// advanced from the sheet has nothing to leave.
	function reconsider(before: TripItem, after: TripItem) {
		const wore = graced.get(after.id);
		if (matchesFilters(after)) release(after.id);
		else if (wore) grace(after.id, wore);
		else if (matchesFilters(before)) grace(after.id, before.status);
	}

	onDestroy(releaseAll);

	function anchored(node: HTMLElement) {
		container = node;
	}

	let kitsOnLines = $derived.by(() => {
		const found: Kit[] = [];
		for (const line of lines) {
			for (const kit of line.kits) {
				if (!found.some((known) => known.id === kit.id)) found.push(kit);
			}
		}
		return found;
	});

	let statusesOnLines = $derived.by(() => {
		const found: ItemStatus[] = [];
		const worn = lines.map((line) => line.status);
		for (const wore of graced.values()) worn.push(wore);
		for (const status of worn) {
			if (!found.some((known) => known.id === status.id)) found.push(status);
		}
		return inHierarchy(found);
	});

	// Between a trip whose every line carries a kit and one where none does, the
	// chip would take everything or nothing: it is only worth a tap when the two
	// kinds of line sit side by side.
	let noKitOffered = $derived(
		kitsOnLines.length > 0 && lines.some((line) => line.kits.length === 0)
	);

	// A choice outlives what offered it: the last line carrying a kit can leave
	// the trip, and the row that offered that kit goes with it. Applying such a
	// choice would empty the list, and counting it on the button would point at a
	// chip nobody can find to unpress — hence `active` counting the chosen and
	// not the kept. It is remembered rather than applied: the kit coming back
	// brings the choice back with it.
	let chosenKits = $derived(
		keptKits.filter((id) =>
			id === NO_KIT ? noKitOffered : kitsOnLines.some((kit) => kit.id === id)
		)
	);
	let chosenPeople = $derived(
		participants.length > 1
			? keptPeople.filter((id) => participants.some((one) => one.id === id))
			: []
	);
	let soleParticipant = $derived(participants.length === 1 ? participants[0].id : null);
	let chosenStatuses = $derived(
		keptStatuses.filter((id) => statusesOnLines.some((one) => one.id === id))
	);

	function matchesFilters(line: TripItem): boolean {
		const inChosenKitOrWithoutKit =
			chosenKits.length === 0 ||
			line.kits.some((kit) => chosenKits.includes(kit.id)) ||
			(chosenKits.includes(NO_KIT) && line.kits.length === 0);
		const commonOrForChosenPerson =
			chosenPeople.length === 0 || line.person === null || chosenPeople.includes(line.person.id);
		const wearsChosenStatus =
			chosenStatuses.length === 0 || chosenStatuses.includes(line.status.id);
		return inChosenKitOrWithoutKit && commonOrForChosenPerson && wearsChosenStatus;
	}

	let filtered = $derived(lines.filter((line) => matchesFilters(line) || graced.has(line.id)));

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

	let itemIdsInTrip = $derived([...new Set(lines.map((line) => line.item_type.id))]);
	let searching = $derived(typed.trim().length > 0);
	let active = $derived(chosenKits.length + chosenPeople.length + chosenStatuses.length);

	let movable = $derived(sorted === 'order' && direction === 'up');

	// An object carried by several kits answers to the one the household ranked
	// first, and one carried by none closes the march — a rank no kit can reach,
	// finite so that two kitless objects compare as equal rather than as `NaN`.
	// Nothing else is compared, so the sort being stable is what keeps a kit's
	// objects in the order the trip stores them.
	const NO_KIT_RANK = Number.MAX_SAFE_INTEGER;

	function firstKitRank(group: Grouped): number {
		return group.kits.reduce((first, kit) => Math.min(first, kit.position), NO_KIT_RANK);
	}

	let shown = $derived.by(() => {
		const base =
			sorted === 'name'
				? [...groups].sort((one, other) => one.item.name.localeCompare(other.item.name))
				: sorted === 'kit'
					? [...groups].sort((one, other) => firstKitRank(one) - firstKitRank(other))
					: movable
						? dragging.rows
						: groups;
		return direction === 'down' ? [...base].reverse() : base;
	});

	function whoever(person: Person | null): string {
		return person ? person.name : m.everyone();
	}

	// One line naming nobody in particular — common, or for the trip's sole
	// participant — has an avatar that tells nothing apart and a name the sheet's
	// title already carries, so the sheet draws that line without either.
	function namesNobody(lines: TripItem[]): boolean {
		if (lines.length !== 1) return false;
		const only = lines[0];
		return only.person === null || only.person.id === soleParticipant;
	}

	function everyLineFor(item: number): TripItem[] {
		return lines.filter((line) => line.item_type.id === item);
	}

	function takenFor(item: number): (number | null)[] {
		return everyLineFor(item).map((line) => line.person?.id ?? null);
	}

	// A trip with one participant or none has nobody else to add a line for,
	// the common line included.
	function whoeverWithoutLine(item: number): (Person | null)[] {
		if (participants.length <= 1) return [];
		const taken = takenFor(item);
		const offered =
			chosenPeople.length === 0
				? participants
				: participants.filter((one) => chosenPeople.includes(one.id));
		return [null, ...offered].filter((person) => !taken.includes(person?.id ?? null));
	}

	function settleDialog() {
		const unwound = opened?.kind === 'remove' || opened?.kind === 'pick' ? opened.back : opened;
		if (!unwound || unwound.kind === 'filters') opened = unwound;
		else opened = everyLineFor(unwound.item.id).length > 0 ? unwound : null;
	}

	// The writes that change the shape of the list — a line appears, disappears,
	// or moves between objects — ask the whole list again, because what comes
	// back is not something the screen could have guessed. Only the two taps
	// repeated dozens of times over one trip, the status and the quantity, take
	// the optimistic path below: it costs a rollback to write, which only pays
	// off on a gesture repeated that often.
	function writeThenReload(call: () => Promise<unknown>): Promise<void> {
		return stepping.run(async () => {
			await call();
			await onchanged();
			settleDialog();
			return [];
		});
	}

	type Patch = { line: TripItem; sent: { status?: number; quantity?: number } };

	// `patching.isPending` only ever describes the latest tap, a second one
	// detaching the observer from the first. So both the count of writes in
	// flight and the invalidation that follows the last of them are read from the
	// mutation cache, under one key every in-place patch shares.
	const patchKey = ['trip-line-patch'];

	const patching = createMutation(
		() => {
			const key = tripLinesQuery(household, trip).queryKey;
			return {
				mutationKey: patchKey,
				mutationFn: ({ line, sent }: Patch) => updateTripItem(household, trip, line.id, sent),
				// A poll already on its way carries the state the tap just left, and
				// would land on top of it: it is dropped before the line is replaced.
				// Only the line being written is snapshotted: a refusal putting back
				// the whole list would also undo every tap that landed since.
				onMutate: async ({ line }: Patch) => {
					stepping.errors = [];
					const known = lines.find((one) => one.id === line.id);
					if (known) reconsider(known, line);
					await queryClient.cancelQueries({ queryKey: key });
					const before = queryClient
						.getQueryData<TripItem[]>(key)
						?.find((one) => one.id === line.id);
					queryClient.setQueryData<TripItem[]>(key, (all) =>
						(all ?? []).map((one) => (one.id === line.id ? line : one))
					);
					return { before };
				},
				onError: (cause: unknown, patch: Patch, context: { before?: TripItem } | undefined) => {
					const before = context?.before;
					if (before) {
						queryClient.setQueryData<TripItem[]>(key, (all) =>
							(all ?? []).map((one) => (one.id === before.id ? before : one))
						);
						reconsider(patch.line, before);
					}
					stepping.errors = failure(cause);
				},
				// A mutation still counts itself here, so one left means this is the
				// last write in flight. Invalidating under an earlier one would hand
				// back a body older than the tap still on its way.
				onSettled: () => {
					if (queryClient.isMutating({ mutationKey: patchKey }) === 1)
						void queryClient.invalidateQueries({ queryKey: key });
				}
			};
		},
		() => queryClient
	);

	const writing = useIsMutating({ mutationKey: patchKey }, queryClient);

	// A component cannot export a derived, and `$bindable` moves the assignment
	// to the parent rather than removing it: reporting these upwards has no
	// simpler shape in runes.
	$effect(() => {
		onbusy?.(dragging.grabbed !== null || stepping.busy || writing.current > 0);
	});

	$effect(() => {
		onfiltered?.(filtered);
	});

	// What empties a card's offer is not always a gesture this component sees — a
	// filter released, a line removed on the other phone — so the open add row is
	// reconciled against the lines rather than folded at each call site.
	$effect(() => {
		if (addRowOn === null) return;
		const carried = lines.some((line) => line.item_type.id === addRowOn);
		if (!carried || whoeverWithoutLine(addRowOn).length === 0) addRowOn = null;
	});

	// Changing the status filter is a deliberate rereading of the list: nothing
	// the previous filter was holding survives it.
	function keepStatuses(chosen: number[]) {
		keptStatuses = chosen;
		releaseAll();
	}

	function clearFilters() {
		keptKits = [];
		keptPeople = [];
		keepStatuses([]);
	}

	type NewLine = { person: number | null; status?: number };

	// The kit row is left out on purpose: adding to a kit rewrites the
	// household's kit for every trip to come, not this trip's list.
	function linesToCreate(item: number): NewLine[] {
		const status = chosenStatuses.length === 1 ? chosenStatuses[0] : undefined;
		const taken = takenFor(item);
		if (chosenPeople.length === 0) {
			return taken.length === 0 ? [{ person: soleParticipant, status }] : [];
		}
		return chosenPeople
			.filter((person) => !taken.includes(person))
			.map((person) => ({ person, status }));
	}

	async function createLines(item: number, wanted: NewLine[]) {
		for (const one of wanted) {
			await createTripItem(household, trip, { item_type: item, ...one });
		}
	}

	// Pointed at once the lines it was owed are back: judged before the reload,
	// the card would still look hidden and the filters would be cleared for
	// nothing.
	async function chosen(item: ItemType) {
		const present = itemIdsInTrip.includes(item.id);
		const wanted = linesToCreate(item.id);
		if (wanted.length > 0) await writeThenReload(() => createLines(item.id, wanted));
		if (!present) return;
		const hiddenByFilters = !groups.some((group) => group.id === item.id);
		if (hiddenByFilters) clearFilters();
		clearTimeout(fading);
		highlighted = item.id;
		fading = setTimeout(() => (highlighted = null), 2500);
		await tick();
		const row = container?.querySelector<HTMLElement>(`[data-row="${item.id}"]`);
		if (!row || !searchRow) return;
		row.style.scrollMarginTop = `${searchRow.offsetHeight}px`;
		row.scrollIntoView({ block: 'nearest' });
	}

	// Stopping the poll leaves a request already on its way, and
	// `Reordering.rows` drops its arrangement as soon as `groups` is a new array
	// — the card would jump out from under the finger. The flight is cancelled
	// without waiting on it: the card has to follow the finger on this very
	// event.
	function grab(event: PointerEvent, group: Grouped) {
		void queryClient.cancelQueries({ queryKey: tripLinesQuery(household, trip).queryKey });
		dragging.grab(event, group);
	}

	function step(line: TripItem, by: number) {
		const quantity = line.quantity + by;
		patching.mutate({ line: { ...line, quantity }, sent: { quantity } });
	}

	let ranked = $derived(inHierarchy(statuses));

	// A line whose status the household deleted while the screen was open has no
	// standing to climb from, and starts the cycle over.
	function advance(line: TripItem) {
		const standing = ranked.findIndex((one) => one.id === line.status.id);
		const next = standing === -1 ? ranked[0] : ranked[(standing + 1) % ranked.length];
		if (!next || next.id === line.status.id) return;
		setStatus(line, next);
	}

	function setStatus(line: TripItem, status: ItemStatus) {
		patching.mutate({ line: { ...line, status }, sent: { status: status.id } });
	}

	function pickFrom(line: TripItem) {
		opened = { kind: 'pick', item: line.item_type, line, back: opened };
	}

	// Silenced, the gesture writes straight away: `opened` stays whatever raised
	// it — the sheet, or nothing at all — and `settleDialog` unwinds it as it
	// does after a confirmed removal.
	function removeLine(item: ItemType, line: TripItem, back: Opened | null) {
		if (confirmations.asks('trip-line')) {
			stopAsking = false;
			opened = { kind: 'remove', item, line, back };
		} else writeThenReload(() => deleteTripItem(household, trip, line.id));
	}

	// Silenced only once the line is gone: a refusal leaves the confirmation
	// standing for the next attempt.
	function confirmRemoval(line: TripItem) {
		writeThenReload(async () => {
			await deleteTripItem(household, trip, line.id);
			if (stopAsking) confirmations.silence('trip-line');
		});
	}

	function picked(line: TripItem, status: ItemStatus) {
		if (opened?.kind !== 'pick') return;
		if (status.id !== line.status.id) setStatus(line, status);
		opened = opened.back;
	}

	let sheet = $derived.by(() => {
		const dialog = opened;
		if (dialog?.kind !== 'sheet') return null;
		const itemLines = everyLineFor(dialog.item.id);
		if (itemLines.length === 0) return null;
		return {
			id: dialog.item.id,
			item: itemLines[0].item_type,
			kits: itemLines[0].kits,
			lines: itemLines
		};
	});

	// The line held by the dialog is the one the hold landed on; the one written
	// and marked is the line as the trip carries it now.
	let picking = $derived.by(() => {
		const dialog = opened;
		if (dialog?.kind !== 'pick') return null;
		const line = lines.find((one) => one.id === dialog.line.id);
		return line ? { line, back: dialog.back } : null;
	});

	let removing = $derived.by(() => {
		const dialog = opened;
		if (dialog?.kind !== 'remove') return null;
		const stillInTrip = lines.some((line) => line.id === dialog.line.id);
		return stillInTrip ? dialog : null;
	});

	// A rename touches no line, so the lines route answers on the same
	// fingerprint and asking again would hand back a body where the old name
	// still stands, undoing what was just learnt. A merge does move lines between
	// objects, so there the fingerprint moves and asking again is truthful.
	async function follow(survivor: ItemType) {
		const absorbed = opened?.kind === 'edit' && survivor.id !== opened.item.id;
		queryClient.setQueryData<TripItem[]>(tripLinesQuery(household, trip).queryKey, (all) =>
			(all ?? []).map((line) =>
				line.item_type.id === survivor.id ? { ...line, item_type: survivor } : line
			)
		);
		if (absorbed) await onchanged();
		opened = { kind: 'sheet', item: survivor };
	}

	// No trip line moved, so the lines route answers on the same fingerprint and
	// a refetch would hand back a body where the object belongs to no new kit,
	// offering the same kit a second time. The kits served are written even when
	// a refusal cuts the run short, so that retrying resumes at the kit it
	// stopped on.
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
						// Not awaited: the kit screens read their own queries, where the
						// kit would still be the one that holds nothing, but waiting on
						// that refetch would hold the whole trip screen busy for a list
						// this write did not change.
						void queryClient.invalidateQueries({ queryKey: kitsQuery(household).queryKey });
					}
				}
				return [];
			})
			.then(() => stepping.errors.length === 0);
	}

	function addFor(group: Grouped, person: Person | null) {
		writeThenReload(() =>
			createTripItem(household, trip, { item_type: group.item.id, person: person?.id ?? null })
		);
	}

	function drop() {
		const move = dragging.drop();
		if (!move || move.to === move.from) return;
		const wanted = orderAfterDrop(dragging.rows, move.row.id, lines, (line) => line.item_type.id);
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

{#snippet controls(line: TripItem)}
	{#if graced.has(line.id)}
		{#key graceRestarts}
			<svg
				role="img"
				aria-label={m.trip_line_leaving()}
				viewBox="0 0 16 16"
				style:--grace="{GRACE_MS}ms"
				class="text-muted-foreground size-4 flex-none -rotate-90"
			>
				<circle
					cx="8"
					cy="8"
					r="6"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					pathLength="1"
					class="draining"
				/>
			</svg>
		{/key}
	{/if}
	<StatusPill
		status={line.status}
		label={m.trip_status_pill({
			name: line.item_type.name,
			who: whoever(line.person),
			status: line.status.name
		})}
		busy={stepping.busy}
		tight
		onadvance={() => advance(line)}
		onpick={() => pickFrom(line)}
	/>
{/snippet}

<div {@attach anchored} class="grid gap-2.5">
	<!-- Beside the field, not inside it: its right edge already carries the
	import icon. Top-aligned so the results list cannot push the button down. -->
	<div
		bind:this={searchRow}
		class="bg-background sticky top-0 z-20 -mx-4 -my-2.5 flex items-start gap-2 px-4 py-2.5"
	>
		<div class="min-w-0 flex-1">
			<ItemPicker
				{household}
				{items}
				held={itemIdsInTrip}
				holding={m.item_in_trip()}
				busy={stepping.busy}
				bind:typed
				onchosen={chosen}
				onadopt={(item) => createLines(item.id, linesToCreate(item.id))}
				onrefresh={onchanged}
			/>
		</div>
		{#if !searching}
			<FiltersButton {active} onclick={() => (opened = { kind: 'filters' })} />
		{/if}
	</div>

	<FormErrors errors={stepping.errors} />

	{#if !searching}
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
				<ObjectCard
					item={group.item}
					lines={group.lines}
					absent={whoeverWithoutLine(group.id)}
					{whoever}
					testid="trip-item"
					{movable}
					grabbed={dragging.grabbed?.id === group.id}
					offset={dragging.offset}
					highlighted={highlighted === group.id}
					unfolded={addRowOn === group.id}
					busy={stepping.busy}
					ongrab={(event) => grab(event, group)}
					onopen={() => (opened = { kind: 'sheet', item: group.item })}
					onunfold={() => (addRowOn = addRowOn === group.id ? null : group.id)}
					onadd={(person) => addFor(group, person)}
					onless={(line) =>
						line.quantity > 1 ? step(line, -1) : removeLine(group.item, line, null)}
					onmore={(line) => step(line, 1)}
					{controls}
				>
					{#snippet beside()}
						{#if group.kits.length > 0}
							<button
								type="button"
								aria-label={m.trip_item_kits({
									name: group.item.name,
									kits: group.kits.map((kit) => kit.name).join(', ')
								})}
								onclick={() => (opened = { kind: 'sheet', item: group.item })}
								class="focus-visible:ring-ring/50 flex min-w-6 flex-1 items-center gap-1 overflow-hidden rounded-full outline-none focus-visible:ring-[3px]"
							>
								<span
									class="bg-accent text-primary min-w-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium"
								>
									{group.kits[0].name}
								</span>
								{#if group.kits.length > 1}
									<span
										class="bg-accent text-primary flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
									>
										{m.trip_item_kits_more({ count: group.kits.length - 1 })}
									</span>
								{/if}
							</button>
						{/if}
					{/snippet}
				</ObjectCard>
			{/each}
		</ul>
	{/if}
</div>

{#if opened?.kind === 'filters'}
	<Modal title={m.trip_filters_open()} onclose={() => (opened = null)}>
		<TripFilters
			kits={kitsOnLines}
			{noKitOffered}
			{participants}
			statuses={statusesOnLines}
			bind:kit={keptKits}
			bind:person={keptPeople}
			bind:status={() => keptStatuses, keepStatuses}
		/>
	</Modal>
{:else if opened?.kind === 'edit'}
	{@const shownItem = opened.item}
	<ItemEditor
		{household}
		item={shownItem}
		onclose={() => {
			// A save has already moved the state onto whatever the write answered
			// with, which after a merge is a different object entirely: only a cancel
			// puts this sheet back.
			if (opened?.kind === 'edit') opened = { kind: 'sheet', item: shownItem };
		}}
		onsaved={follow}
	/>
{:else if removing}
	{@const { item, line, back } = removing}
	<Modal
		title={m.trip_line_remove_title({ name: item.name, who: whoever(line.person) })}
		onclose={() => (opened = back)}
	>
		<p class="text-muted-foreground text-sm">{m.trip_line_remove_explains()}</p>
		<FormErrors errors={stepping.errors} />
		<DontAskAgain bind:checked={stopAsking} />
		<Button variant="destructive" disabled={stepping.busy} onclick={() => confirmRemoval(line)}>
			{m.trip_line_remove()}
		</Button>
	</Modal>
{:else if picking}
	{@const { line, back } = picking}
	<Modal
		title={m.trip_status_pick_title({ name: line.item_type.name, who: whoever(line.person) })}
		onclose={() => (opened = back)}
	>
		<ul class="grid gap-1.5">
			{#each ranked as one (one.id)}
				{@const current = one.id === line.status.id}
				<li>
					<RowCard
						aria-pressed={current}
						disabled={stepping.busy}
						onclick={() => picked(line, one)}
						class={current ? 'border-primary bg-accent' : undefined}
					>
						<span
							aria-hidden="true"
							class="size-[9px] flex-none rounded-full"
							style:background-color={one.color}
						></span>
						<span class="min-w-0 flex-1 truncate text-sm font-medium">{one.name}</span>
						{#if current}
							<CheckIcon size={16} aria-hidden="true" class="text-primary flex-none" />
						{/if}
					</RowCard>
				</li>
			{/each}
		</ul>
	</Modal>
{:else if sheet}
	{@const shownSheet = sheet}
	<TripItemSheet
		item={shownSheet.item}
		kits={shownSheet.kits}
		offered={kits}
		lines={shownSheet.lines}
		nameless={namesNobody(shownSheet.lines)}
		absent={whoeverWithoutLine(shownSheet.id)}
		errors={stepping.errors}
		busy={stepping.busy}
		{whoever}
		onclose={() => (opened = null)}
		onadvance={advance}
		onpick={pickFrom}
		onstep={step}
		onremove={(line) => removeLine(shownSheet.item, line, opened)}
		onadd={(person) => addFor(shownSheet, person)}
		onedit={() => (opened = { kind: 'edit', item: shownSheet.item })}
		onpicking={() => (stepping.errors = [])}
		onaddtokits={(wanted) => addToKits(shownSheet, wanted)}
	/>
{/if}

<style>
	.draining {
		stroke-dasharray: 1;
		animation: drain var(--grace) linear forwards;
	}

	@keyframes drain {
		to {
			stroke-dashoffset: -1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.draining {
			animation: none;
		}
	}
</style>
