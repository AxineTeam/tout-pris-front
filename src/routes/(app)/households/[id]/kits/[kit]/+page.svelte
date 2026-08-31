<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import type { Kit } from '$lib/api.js';
	import KitContents from '$lib/components/KitContents.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { itemsQuery, kitQuery, kitsQuery, personsQuery, queryClient } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const kit = createQuery(() => kitQuery(data.household.id, data.kit));
	const persons = createQuery(() => personsQuery(data.household.id));
	const items = createQuery(() => itemsQuery(data.household.id));

	async function refresh() {
		await queryClient.invalidateQueries({ queryKey: kitsQuery(data.household.id).queryKey });
	}

	// Sorti de la liste sans invalider : la clé du détail prolonge celle de la
	// liste, et une invalidation relancerait un `readKit` sur le kit qu'on vient
	// de supprimer — un 404 que la requête retenterait trois fois avant de
	// rendre la main, en retenant la navigation d'autant.
	// Et seulement si la liste est déjà en cache : `setQueryData` crée l'entrée
	// quand elle manque, et y poser une liste vide et fraîche viderait l'écran
	// des kits pour tout le `staleTime`. Arriver directement ici — un F5, un lien
	// partagé — ne charge pas la liste.
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
		kit={kit.data}
		persons={persons.data ?? []}
		items={items.data ?? []}
		onchanged={refresh}
		onremoved={removed}
	/>
{/if}
