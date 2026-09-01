<script module lang="ts">
	export type Sorting = 'order' | 'name' | 'progress';
</script>

<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import {
		createTripItem,
		deleteTripItem,
		updateTripItem,
		type ItemType,
		type Kit,
		type Person,
		type ProgressCategory,
		type TripItem
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemPicker from '$lib/components/ItemPicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
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
		sorted = 'order',
		onchanged
	}: {
		household: number;
		trip: number;
		lines: TripItem[];
		participants: Person[];
		items: ItemType[];
		sorted?: Sorting;
		onchanged: () => Promise<void>;
	} = $props();

	const stepping = new Submission();
	let typed = $state('');
	let removed = $state.raw<{ group: Grouped; line: TripItem } | null>(null);
	let highlighted = $state.raw<number | null>(null);
	let container = $state.raw<HTMLElement>();

	function anchored(node: HTMLElement) {
		container = node;
	}

	const rank: Record<ProgressCategory, number> = { not_started: 0, in_progress: 1, done: 2 };

	let groups = $derived.by(() => {
		const found: Grouped[] = [];
		for (const line of lines) {
			const group = found.find((known) => known.id === line.item_type.id);
			if (group) group.lines.push(line);
			else
				found.push({ id: line.item_type.id, item: line.item_type, kits: line.kits, lines: [line] });
		}
		return found;
	});

	let held = $derived(groups.map((group) => group.item.id));
	let searching = $derived(typed.trim().length > 0);

	function leastAdvanced(group: Grouped): number {
		return Math.min(...group.lines.map((line) => rank[line.status.progress]));
	}

	let shown = $derived.by(() => {
		if (sorted === 'name') {
			return [...groups].sort((one, other) => one.item.name.localeCompare(other.item.name));
		}
		if (sorted === 'progress') {
			return [...groups].sort((one, other) => leastAdvanced(one) - leastAdvanced(other));
		}
		return groups;
	});

	function whoever(person: Person | null): string {
		return person ? person.name : m.trip_everyone();
	}

	// Only the people going: a line aimed at someone who stayed home would be a
	// row nobody packs, and the API refuses it anyway.
	function missing(group: Grouped): (Person | null)[] {
		const taken = group.lines.map((line) => line.person?.id ?? null);
		return [null, ...participants].filter((person) => !taken.includes(person?.id ?? null));
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

	function addFor(group: Grouped, person: Person | null) {
		act(() =>
			createTripItem(household, trip, { item_type: group.item.id, person: person?.id ?? null })
		);
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

<div {@attach anchored} class="grid gap-4">
	<ItemPicker {household} {items} {held} bind:typed onchosen={chosen} />

	<FormErrors errors={stepping.errors} />

	{#if !searching}
		{#if groups.length === 0}
			<p class="text-muted-foreground text-sm" data-testid="trip-empty">{m.trip_empty()}</p>
		{/if}

		<ul class="grid min-w-0 gap-2">
			{#each shown as group (group.id)}
				{@const absent = missing(group)}
				<li
					data-row={group.id}
					data-trip-item={group.id}
					class={[
						'border-border bg-card grid min-w-0 gap-1 rounded-xl border px-3 pt-2.5 pb-1 transition-colors',
						highlighted === group.id && 'border-primary bg-accent'
					]}
				>
					<div class="flex min-w-0 items-start gap-2">
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">{group.item.name}</span>
							{#if group.item.description}
								<span class="text-muted-foreground block truncate text-xs">
									{group.item.description}
								</span>
							{/if}
						</span>
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
								<span class="border-border flex flex-none items-center rounded-lg border">
									<Button
										variant="ghost"
										size="icon"
										aria-label={m.trip_quantity_less({ who: whoever(line.person) })}
										disabled={stepping.busy}
										onclick={() =>
											line.quantity > 1 ? step(line, -1) : (removed = { group, line })}
										class="text-primary size-11 rounded-r-none"
									>
										<MinusIcon class="size-[15px]" aria-hidden="true" />
									</Button>
									<span class="min-w-6 text-center text-[13px] font-semibold">{line.quantity}</span>
									<Button
										variant="ghost"
										size="icon"
										aria-label={m.trip_quantity_more({ who: whoever(line.person) })}
										disabled={stepping.busy}
										onclick={() => step(line, 1)}
										class="text-primary size-11 rounded-l-none"
									>
										<PlusIcon class="size-[15px]" aria-hidden="true" />
									</Button>
								</span>
								<span class="flex w-[104px] flex-none items-center gap-1.5">
									<span
										aria-hidden="true"
										class="size-[9px] flex-none rounded-full"
										style:background-color={line.status.color}
									></span>
									<span class="text-muted-foreground truncate text-xs">{line.status.name}</span>
								</span>
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
