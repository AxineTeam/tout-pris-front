<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import KitList from '$lib/components/KitList.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { householdsQuery, kitsQuery, queryClient } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const kits = createQuery(() => kitsQuery(data.household.id));
	const households = createQuery(() => householdsQuery());
</script>

<svelte:head><title>{m.title_kits()}</title></svelte:head>

<ScreenHeader title={m.kits_title()} switcher />

<KitList
	household={data.household.id}
	households={households.data ?? []}
	kits={kits.data ?? []}
	onchanged={() =>
		queryClient.invalidateQueries({ queryKey: kitsQuery(data.household.id).queryKey })}
/>
