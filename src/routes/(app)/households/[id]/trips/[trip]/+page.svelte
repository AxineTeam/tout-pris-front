<script lang="ts">
	import { resolve } from '$app/paths';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: params.id }));
</script>

<svelte:head><title>{m.title_trip()}</title></svelte:head>

<ScreenHeader title={m.trip_title()} {back} />
