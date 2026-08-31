<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripForm from '$lib/components/TripForm.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { kitsQuery, personsQuery, tripQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const trip = createQuery(() => tripQuery(data.household.id, data.trip));
	const persons = createQuery(() => personsQuery(data.household.id));
	const kits = createQuery(() => kitsQuery(data.household.id));

	let back = $derived(
		resolve('/(app)/households/[id]/trips/[trip]', {
			id: String(data.household.id),
			trip: String(data.trip)
		})
	);
</script>

<svelte:head><title>{m.trip_edit()}</title></svelte:head>

<ScreenHeader title={m.trip_edit()} subtitle={trip.data?.name} {back} />

{#if trip.data}
	<TripForm
		household={data.household.id}
		persons={persons.data ?? []}
		kits={kits.data ?? []}
		trip={trip.data}
	/>
{/if}
