<script lang="ts">
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let { active, onclick }: { active: number; onclick: () => void } = $props();
</script>

<Button
	variant="outline"
	size="icon"
	aria-label={active > 0 ? m.trip_filters_active({ count: active }) : m.trip_filters_open()}
	{onclick}
	class="h-11 w-auto min-w-11 flex-none gap-1.5 px-2.5"
	data-testid="trip-filters-open"
>
	<SlidersHorizontalIcon class="size-[18px]" aria-hidden="true" />
	{#if active > 0}
		<span class="text-[13px] font-semibold">{active}</span>
	{/if}
</Button>
