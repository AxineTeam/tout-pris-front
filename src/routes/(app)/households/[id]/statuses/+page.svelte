<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import HouseholdStatuses from '$lib/components/HouseholdStatuses.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { householdLabel } from '$lib/households.js';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.statuses_title()}</title></svelte:head>

<ScreenHeader
	title={m.statuses_title()}
	subtitle={householdLabel(data.household)}
	back={resolve('/(app)/households/[id]', { id: String(data.household.id) })}
/>

<HouseholdStatuses
	household={data.household.id}
	statuses={data.statuses}
	onchanged={invalidateAll}
/>
