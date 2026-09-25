<script module lang="ts">
	// Kit ids come from the API and are positive, so the row can carry "in no
	// kit" as one more entry of the same list rather than as a flag beside it.
	export const NO_KIT = -1;

	// The sign travels beside the id, never inside it: `NO_KIT` already spends
	// the negative half of the range, so a negated id would land on it.
	export type Chosen = { id: number; excluded: boolean };

	export function cycle(all: Chosen[], id: number): Chosen[] {
		const known = all.find((one) => one.id === id);
		if (!known) return [...all, { id, excluded: false }];
		if (!known.excluded) return all.map((one) => (one.id === id ? { id, excluded: true } : one));
		return all.filter((one) => one.id !== id);
	}

	export function included(all: Chosen[]): number[] {
		return all.filter((one) => !one.excluded).map((one) => one.id);
	}

	// A row is an OR of what it includes and an AND of the negations of what it
	// excludes, read against everything a line carries for that row: a line
	// carrying several kits is excluded when one of them is excluded, not kept
	// because another one is not.
	export function matchesRow(chosen: Chosen[], carried: number[]): boolean {
		const wanted = included(chosen);
		return (
			(wanted.length === 0 || wanted.some((id) => carried.includes(id))) &&
			!chosen.some((one) => one.excluded && carried.includes(one.id))
		);
	}
</script>

<script lang="ts">
	import type { ItemStatus, Kit, Person } from '$lib/api.js';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		kits,
		noKitOffered,
		participants,
		statuses,
		kit = $bindable([]),
		person = $bindable([]),
		status = $bindable([])
	}: {
		kits: Kit[];
		noKitOffered: boolean;
		participants: Person[];
		statuses: ItemStatus[];
		kit?: Chosen[];
		person?: Chosen[];
		status?: Chosen[];
	} = $props();

	// The button is the 44 px target and the pill inside is what shows. Growing
	// the pill itself would not do: the rows scroll sideways, and a sideways
	// scroller computes the other axis as a scroller too, so anything reaching
	// out of the button's box to widen the target is clipped rather than tapped.
	const tap =
		'focus-visible:ring-ring/50 flex h-11 flex-none items-center rounded-full outline-none focus-visible:ring-[3px]';
	const pill =
		'flex h-8 min-w-0 items-center rounded-full border text-xs font-medium whitespace-nowrap transition-colors';
	const on = 'border-primary bg-primary text-primary-foreground';
	const out = 'border-primary text-primary bg-card';
	const off = 'border-border bg-card text-foreground hover:bg-accent';
	// The rows scroll sideways and bleed into the padding Modal sets, so a chip
	// cut off at the edge reads as more to come rather than as a chip drawn
	// short.
	const row = '-mx-5 -my-1.5 flex gap-1.5 overflow-x-auto px-5';
	const section = 'grid gap-1.5';
	const heading = 'text-muted-foreground text-xs font-medium';

	// The sign is written into the label rather than drawn beside it: the chip
	// holds three states, which no pressed flag can tell apart, and the text a
	// reader hears is then the text the screen shows.
	function chip(chosen: Chosen[], id: number, name: string): { label: string; tone: string } {
		const known = chosen.find((one) => one.id === id);
		if (!known) return { label: name, tone: off };
		return known.excluded
			? { label: m.trip_filter_excluded({ name }), tone: out }
			: { label: m.trip_filter_included({ name }), tone: on };
	}
</script>

{#if kits.length > 0}
	<div class={section}>
		<p id="trip-filter-kits" class={heading}>{m.trip_filter_kits()}</p>
		<div role="group" aria-labelledby="trip-filter-kits" class={row}>
			<button type="button" aria-pressed={kit.length === 0} onclick={() => (kit = [])} class={tap}>
				<span class={[pill, 'px-2.5', kit.length === 0 ? on : off]}>{m.trip_filter_all()}</span>
			</button>
			{#each kits as one (one.id)}
				{@const shown = chip(kit, one.id, one.name)}
				<button type="button" onclick={() => (kit = cycle(kit, one.id))} class={tap}>
					<span class={[pill, 'px-2.5', shown.tone]}>{shown.label}</span>
				</button>
			{/each}
			{#if noKitOffered}
				{@const shown = chip(kit, NO_KIT, m.trip_filter_no_kit())}
				<button type="button" onclick={() => (kit = cycle(kit, NO_KIT))} class={tap}>
					<span class={[pill, 'px-2.5', shown.tone]}>{shown.label}</span>
				</button>
			{/if}
		</div>
	</div>
{/if}

{#if participants.length > 1}
	<div class={section}>
		<p id="trip-filter-people" class={heading}>{m.trip_filter_people()}</p>
		<div role="group" aria-labelledby="trip-filter-people" class={row}>
			<button
				type="button"
				aria-pressed={person.length === 0}
				onclick={() => (person = [])}
				class={tap}
			>
				<span class={[pill, 'px-2.5', person.length === 0 ? on : off]}>{m.trip_filter_all()}</span>
			</button>
			{#each participants as one (one.id)}
				{@const shown = chip(person, one.id, one.name)}
				<button type="button" onclick={() => (person = cycle(person, one.id))} class={tap}>
					<span class={[pill, 'gap-1.5 pr-2.5 pl-1', shown.tone]}>
						<PersonAvatar person={one} small />
						{shown.label}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

{#if statuses.length > 0}
	<div class={section}>
		<p id="trip-filter-statuses" class={heading}>{m.trip_filter_statuses()}</p>
		<div role="group" aria-labelledby="trip-filter-statuses" class={row}>
			<button
				type="button"
				aria-pressed={status.length === 0}
				onclick={() => (status = [])}
				class={tap}
			>
				<span class={[pill, 'px-2.5', status.length === 0 ? on : off]}>{m.trip_filter_all()}</span>
			</button>
			{#each statuses as one (one.id)}
				{@const shown = chip(status, one.id, one.name)}
				<button type="button" onclick={() => (status = cycle(status, one.id))} class={tap}>
					<span class={[pill, 'gap-1.5 px-2.5', shown.tone]}>
						<span
							aria-hidden="true"
							class="size-[9px] flex-none rounded-full"
							style:background-color={one.color}
						></span>
						{shown.label}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
