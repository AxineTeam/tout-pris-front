<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripList from '$lib/components/TripList.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.title_trips()}</title></svelte:head>

<ScreenHeader title={m.trips_title()} switcher />

<TripList
	household={data.household.id}
	trips={data.trips}
	archived={data.archived}
	onchanged={invalidateAll}
/>
