<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import KitList from '$lib/components/KitList.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { kitsQuery, queryClient } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const kits = createQuery(() => kitsQuery(data.household.id));
</script>

<svelte:head><title>{m.title_kits()}</title></svelte:head>

<ScreenHeader title={m.kits_title()} switcher />

<KitList
	household={data.household.id}
	kits={kits.data ?? []}
	onchanged={() =>
		queryClient.invalidateQueries({ queryKey: kitsQuery(data.household.id).queryKey })}
/>
