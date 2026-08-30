<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import KitList from '$lib/components/KitList.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.title_kits()}</title></svelte:head>

<ScreenHeader title={m.kits_title()} switcher />

<KitList household={data.household.id} kits={data.kits} onchanged={invalidateAll} />
