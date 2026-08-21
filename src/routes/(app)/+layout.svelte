<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import HouseholdSwitcher from '$lib/components/HouseholdSwitcher.svelte';
	import { households } from '$lib/households.svelte.js';

	let { children }: { children: Snippet } = $props();

	let current = $derived(households.find(Number(page.params.id)));

	afterNavigate(() => {
		if (current) households.remember(current.id);
	});
</script>

<div class="space-y-6">
	{#if current}
		<HouseholdSwitcher all={households.all} {current} />
	{/if}
	{@render children()}
</div>
