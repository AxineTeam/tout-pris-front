<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { resolve } from '$app/paths';
	import HouseholdStatuses from '$lib/components/HouseholdStatuses.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { householdLabel } from '$lib/households.js';
	import * as m from '$lib/paraglide/messages.js';
	import { queryClient, statusesQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statuses = createQuery(() => statusesQuery(data.household.id));
</script>

<svelte:head><title>{m.statuses_title()}</title></svelte:head>

<ScreenHeader
	title={m.statuses_title()}
	subtitle={householdLabel(data.household)}
	back={resolve('/(app)/households/[id]', { id: String(data.household.id) })}
/>

<HouseholdStatuses
	household={data.household.id}
	statuses={statuses.data ?? []}
	onchanged={() =>
		queryClient.invalidateQueries({ queryKey: statusesQuery(data.household.id).queryKey })}
/>
