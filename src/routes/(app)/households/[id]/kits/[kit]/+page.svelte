<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import type { Kit } from '$lib/api.js';
	import KitContents from '$lib/components/KitContents.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		householdsQuery,
		itemsQuery,
		kitQuery,
		kitsQuery,
		personsQuery,
		queryClient
	} from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const kit = createQuery(() => kitQuery(data.household.id, data.kit));
	const persons = createQuery(() => personsQuery(data.household.id));
	const items = createQuery(() => itemsQuery(data.household.id));
	const households = createQuery(() => householdsQuery());

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: kitsQuery(data.household.id).queryKey });
	}

	// Dropped from the list rather than invalidated: the detail key extends the
	// list's, and invalidating would fire a `readKit` on the kit just deleted — a
	// 404 the query retries three times before handing the navigation back. And
	// only if the list is cached: `setQueryData` would create the entry, and a
	// fresh empty list there would empty the kits screen for the whole
	// `staleTime`.
	function removed() {
		queryClient.removeQueries({ queryKey: kitQuery(data.household.id, data.kit).queryKey });
		const listed = kitsQuery(data.household.id).queryKey;
		if (!queryClient.getQueryData(listed)) return;
		queryClient.setQueryData<Kit[]>(listed, (all) =>
			(all ?? []).filter((known) => known.id !== data.kit)
		);
	}
</script>

<svelte:head>
	{#if kit.data}<title>{m.title_kit({ name: kit.data.name })}</title>{/if}
</svelte:head>

{#if kit.data}
	<KitContents
		household={data.household.id}
		households={households.data ?? []}
		kit={kit.data}
		persons={persons.data ?? []}
		items={items.data ?? []}
		onchanged={refresh}
		onremoved={removed}
	/>
{/if}
