<script lang="ts">
	import ArrowDown10Icon from '@lucide/svelte/icons/arrow-down-1-0';
	import ArrowDownZAIcon from '@lucide/svelte/icons/arrow-down-z-a';
	import ArrowUp01Icon from '@lucide/svelte/icons/arrow-up-0-1';
	import ArrowUpAZIcon from '@lucide/svelte/icons/arrow-up-a-z';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripLines, { type Direction, type Sorting } from '$lib/components/TripLines.svelte';
	import TripProgress from '$lib/components/TripProgress.svelte';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { itemsQuery, kitsQuery, statusesQuery, tripLinesQuery, tripQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const client = useQueryClient();
	const trip = createQuery(() => tripQuery(data.household.id, data.trip));
	const lines = createQuery(() => tripLinesQuery(data.household.id, data.trip));
	const items = createQuery(() => itemsQuery(data.household.id));
	const statuses = createQuery(() => statusesQuery(data.household.id));
	const kits = createQuery(() => kitsQuery(data.household.id));

	let sorted = $state<Sorting>('order');
	let direction = $state<Direction>('up');

	// One button per sort, and the button carries its own direction: pressing the
	// sort already in force turns it around instead of doing nothing.
	//
	// The label states where the list stands, because `aria-pressed` states the
	// same thing: naming the next tap instead would have a reader announce
	// "Z to A, pressed" over a list running A to Z.
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
		}
	]);

	function sort(key: Sorting) {
		if (sorted === key) direction = direction === 'up' ? 'down' : 'up';
		else {
			sorted = key;
			direction = 'up';
		}
	}

	let known = $derived(lines.data ?? []);
	let going = $derived((trip.data?.participants ?? []).map((one) => one.person));
	let ready = $derived(known.filter((line) => line.status.progress === 'done').length);

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: String(data.household.id) }));

	let subtitle = $derived(
		trip.data
			? known.length > 0
				? m.trip_subtitle({ date: locale.day(trip.data.date), done: ready, total: known.length })
				: locale.day(trip.data.date)
			: undefined
	);

	async function reload() {
		await client.invalidateQueries({
			queryKey: tripLinesQuery(data.household.id, data.trip).queryKey
		});
	}
</script>

<svelte:head><title>{trip.data?.name ?? m.trip_title()}</title></svelte:head>

<ScreenHeader
	title={trip.data?.name ?? m.trip_title()}
	{subtitle}
	{back}
	actions={[
		{
			label: m.trip_edit(),
			icon: PencilIcon,
			onclick: () =>
				goto(
					resolve('/(app)/households/[id]/trips/[trip]/edit', {
						id: String(data.household.id),
						trip: String(data.trip)
					})
				)
		}
	]}
>
	{#snippet extra()}
		{#each sortings as sorting (sorting.key)}
			<button
				type="button"
				aria-pressed={sorted === sorting.key}
				aria-label={sorting.label}
				onclick={() => sort(sorting.key)}
				class={[
					"focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-[34px] items-center justify-center rounded-md border transition-colors outline-none after:absolute after:-inset-[5px] after:content-[''] focus-visible:ring-[3px]",
					sorted === sorting.key
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border bg-card text-primary hover:bg-accent active:bg-primary/25'
				]}
			>
				<sorting.icon size={16} aria-hidden="true" />
			</button>
		{/each}
	{/snippet}
</ScreenHeader>

<TripProgress lines={known} />

<TripLines
	household={data.household.id}
	trip={data.trip}
	lines={known}
	participants={going}
	items={items.data ?? []}
	kits={kits.data ?? []}
	statuses={statuses.data ?? []}
	{sorted}
	{direction}
	onchanged={reload}
/>
