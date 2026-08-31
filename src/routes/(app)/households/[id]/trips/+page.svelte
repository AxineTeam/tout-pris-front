<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripList from '$lib/components/TripList.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { queryClient, tripsKey, tripsQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const trips = createQuery(() => tripsQuery(data.household.id));
	const archived = createQuery(() => tripsQuery(data.household.id, true));
</script>

<svelte:head><title>{m.title_trips()}</title></svelte:head>

<ScreenHeader title={m.trips_title()} switcher />

<TripList
	household={data.household.id}
	trips={trips.data ?? []}
	archived={archived.data ?? []}
	onchanged={() => queryClient.invalidateQueries({ queryKey: tripsKey(data.household.id) })}
/>
