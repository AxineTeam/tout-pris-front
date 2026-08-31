<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { tripQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const trip = createQuery(() => tripQuery(data.household.id, data.trip));

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: String(data.household.id) }));
</script>

<svelte:head><title>{trip.data?.name ?? m.trip_title()}</title></svelte:head>

<ScreenHeader
	title={trip.data?.name ?? m.trip_title()}
	subtitle={trip.data ? locale.day(trip.data.date) : undefined}
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
/>
