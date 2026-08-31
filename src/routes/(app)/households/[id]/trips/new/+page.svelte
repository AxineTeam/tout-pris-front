<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripForm from '$lib/components/TripForm.svelte';
	import { householdLabel } from '$lib/households.js';
	import * as m from '$lib/paraglide/messages.js';
	import { kitsQuery, personsQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const persons = createQuery(() => personsQuery(data.household.id));
	const kits = createQuery(() => kitsQuery(data.household.id));

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: String(data.household.id) }));
</script>

<svelte:head><title>{m.trip_new()}</title></svelte:head>

<ScreenHeader title={m.trip_new()} subtitle={householdLabel(data.household)} {back} />

<TripForm household={data.household.id} persons={persons.data ?? []} kits={kits.data ?? []} />
