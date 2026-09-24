<script lang="ts">
	import ArrowDown10Icon from '@lucide/svelte/icons/arrow-down-1-0';
	import ArrowDownZAIcon from '@lucide/svelte/icons/arrow-down-z-a';
	import ArrowUp01Icon from '@lucide/svelte/icons/arrow-up-0-1';
	import ArrowUpAZIcon from '@lucide/svelte/icons/arrow-up-a-z';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LayersArrowDownIcon from '@lucide/svelte/icons/layers-arrow-down';
	import LayersArrowUpIcon from '@lucide/svelte/icons/layers-arrow-up';
	import Modal from '$lib/components/Modal.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { headerControl } from '$lib/components/ScreenHeader.svelte';
	import type { Direction, Sorting } from '$lib/components/TripLines.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		sorted = $bindable('order'),
		direction = $bindable('up')
	}: { sorted?: Sorting; direction?: Direction } = $props();

	let opened = $state(false);

	// The label states where the list stands, because `aria-pressed` states the
	// same thing: naming the next tap instead would have a reader announce “Z to
	// A, pressed” over a list running A to Z.
	let sortings = $derived([
		{
			key: 'order' as Sorting,
			icon: direction === 'down' && sorted === 'order' ? ArrowDown10Icon : ArrowUp01Icon,
			label:
				sorted === 'order' && direction === 'down'
					? m.trip_sort_order_last()
					: m.trip_sort_order_first()
		},
		{
			key: 'name' as Sorting,
			icon: direction === 'down' && sorted === 'name' ? ArrowDownZAIcon : ArrowUpAZIcon,
			label:
				sorted === 'name' && direction === 'down' ? m.trip_sort_name_z_a() : m.trip_sort_name_a_z()
		},
		{
			key: 'kit' as Sorting,
			icon: direction === 'down' && sorted === 'kit' ? LayersArrowDownIcon : LayersArrowUpIcon,
			label:
				sorted === 'kit' && direction === 'down' ? m.trip_sort_kit_last() : m.trip_sort_kit_first()
		}
	]);

	let current = $derived(sortings.find((one) => one.key === sorted) ?? sortings[0]);

	// Nothing combines here — one sorting is the whole setting — and the list the
	// choice has just reordered sits behind the sheet, so the sheet gets out of
	// the way rather than waiting for a second choice that would undo the first.
	function choose(key: Sorting) {
		if (sorted === key) direction = direction === 'up' ? 'down' : 'up';
		else {
			sorted = key;
			direction = 'up';
		}
		opened = false;
	}
</script>

<!-- The button names what it does, not where the list stands: a reader hearing
“sort by name A to Z, opens a dialog” would be promised a sort and handed a
sheet. The sorting in force shows as its icon, is spoken by the marked row
inside, and is read off the list itself — unlike a filter, which hides rows
without saying so and is why that button carries its count. -->
<button
	type="button"
	aria-haspopup="dialog"
	aria-label={m.trip_sort_title()}
	data-testid="trip-sort-open"
	onclick={() => (opened = true)}
	class={headerControl}
>
	<current.icon size={16} aria-hidden="true" />
</button>

{#if opened}
	<Modal title={m.trip_sort_title()} onclose={() => (opened = false)}>
		<ul class="grid gap-1.5">
			{#each sortings as sorting (sorting.key)}
				{@const chosen = sorting.key === sorted}
				<li>
					<RowCard
						aria-pressed={chosen}
						onclick={() => choose(sorting.key)}
						class={chosen ? 'border-primary bg-accent' : undefined}
					>
						<sorting.icon size={16} aria-hidden="true" class="text-primary flex-none" />
						<span class="min-w-0 flex-1 text-sm font-medium">{sorting.label}</span>
						{#if chosen}
							<CheckIcon size={16} aria-hidden="true" class="text-primary flex-none" />
						{/if}
					</RowCard>
				</li>
			{/each}
		</ul>
	</Modal>
{/if}
