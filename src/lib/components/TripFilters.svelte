<script lang="ts">
	import type { ItemStatus, Kit, Person } from '$lib/api.js';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { toggle } from '$lib/utils.js';

	let {
		kits,
		participants,
		statuses,
		kit = $bindable([]),
		person = $bindable([]),
		status = $bindable([])
	}: {
		kits: Kit[];
		participants: Person[];
		statuses: ItemStatus[];
		kit?: number[];
		person?: number[];
		status?: number[];
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
	const off = 'border-border bg-card text-foreground hover:bg-accent';
	// The rows scroll sideways and bleed into the sheet's padding, so a chip cut
	// off at the edge reads as more to come rather than as a chip drawn short.
	// The bleed is the padding Modal sets, not the one the trip screen sets: the
	// three rows live nowhere else now.
	const row = '-mx-5 -my-1.5 flex gap-1.5 overflow-x-auto px-5';
	// The sheet lays its children out on a grid with room between them, so each
	// title travels with its own row rather than floating between two.
	const section = 'grid gap-1.5';
	const heading = 'text-muted-foreground text-xs font-medium';
</script>

{#if kits.length > 0}
	<div class={section}>
		<p id="trip-filter-kits" class={heading}>{m.trip_filter_kits()}</p>
		<div role="group" aria-labelledby="trip-filter-kits" class={row}>
			<button type="button" aria-pressed={kit.length === 0} onclick={() => (kit = [])} class={tap}>
				<span class={[pill, 'px-2.5', kit.length === 0 ? on : off]}>{m.trip_filter_all()}</span>
			</button>
			{#each kits as one (one.id)}
				<button
					type="button"
					aria-pressed={kit.includes(one.id)}
					onclick={() => (kit = toggle(kit, one.id))}
					class={tap}
				>
					<span class={[pill, 'px-2.5', kit.includes(one.id) ? on : off]}>{one.name}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

{#if participants.length > 0}
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
				<button
					type="button"
					aria-pressed={person.includes(one.id)}
					onclick={() => (person = toggle(person, one.id))}
					class={tap}
				>
					<span class={[pill, 'gap-1.5 pr-2.5 pl-1', person.includes(one.id) ? on : off]}>
						<PersonAvatar person={one} small />
						{one.name}
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
				<button
					type="button"
					aria-pressed={status.includes(one.id)}
					onclick={() => (status = toggle(status, one.id))}
					class={tap}
				>
					<span class={[pill, 'gap-1.5 px-2.5', status.includes(one.id) ? on : off]}>
						<span
							aria-hidden="true"
							class="size-[9px] flex-none rounded-full"
							style:background-color={one.color}
						></span>
						{one.name}
					</span>
				</button>
			{/each}
		</div>
	</div>
{/if}
