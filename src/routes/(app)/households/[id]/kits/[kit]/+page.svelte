<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import KitContents from '$lib/components/KitContents.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.title_kit({ name: data.kit.name })}</title></svelte:head>

<KitContents
	household={data.household.id}
	kit={data.kit}
	persons={data.persons}
	onchanged={invalidateAll}
/>
