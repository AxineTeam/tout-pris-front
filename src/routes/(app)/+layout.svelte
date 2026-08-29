<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import HouseholdSwitcher from '$lib/components/HouseholdSwitcher.svelte';
	import { households } from '$lib/households.svelte.js';

	let { children }: { children: Snippet } = $props();

	let current = $derived(households.find(Number(page.params.id)));
	let household = $derived(current ?? households.landing);

	afterNavigate(() => {
		if (current) households.remember(current.id);
	});
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
		<div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
			{#if current}
				<HouseholdSwitcher all={households.all} {current} />
			{/if}
			{@render children()}
		</div>
	</div>
	<BottomNav household={household?.id} />
</div>
