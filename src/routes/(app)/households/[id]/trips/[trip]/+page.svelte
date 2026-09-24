<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { TripItem } from '$lib/api.js';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripLines, { type Direction, type Sorting } from '$lib/components/TripLines.svelte';
	import TripProgress from '$lib/components/TripProgress.svelte';
	import TripSort from '$lib/components/TripSort.svelte';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { itemsQuery, kitsQuery, statusesQuery, tripLinesQuery, tripQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Declared before the query that reads it: `createQuery` calls its options
	// once on creation, and a `$state` read above its own declaration throws.
	let busy = $state(false);

	const client = useQueryClient();
	const trip = createQuery(() => tripQuery(data.household.id, data.trip));
	const lines = createQuery(() => tripLinesQuery(data.household.id, data.trip, busy));
	const items = createQuery(() => itemsQuery(data.household.id));
	const statuses = createQuery(() => statusesQuery(data.household.id));
	const kits = createQuery(() => kitsQuery(data.household.id));

	let sorted = $state<Sorting>('order');
	let direction = $state<Direction>('up');

	let known = $derived(lines.data ?? []);
	let filtered = $state.raw<TripItem[]>([]);
	let going = $derived((trip.data?.participants ?? []).map((one) => one.person));
	let ready = $derived(filtered.filter((line) => line.status.progress === 'done').length);

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: String(data.household.id) }));

	let subtitle = $derived(
		trip.data
			? filtered.length > 0
				? m.trip_subtitle({ date: locale.day(trip.data.date), done: ready, total: filtered.length })
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
		<TripSort bind:sorted bind:direction />
	{/snippet}
</ScreenHeader>

<TripProgress lines={filtered} />

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
	onbusy={(held) => (busy = held)}
	onfiltered={(lines) => (filtered = lines)}
	onchanged={reload}
/>
