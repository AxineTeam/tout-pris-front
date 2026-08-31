<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { landing, remember } from '$lib/households.js';
	import { householdsQuery } from '$lib/query.js';

	let { children }: { children: Snippet } = $props();

	const all = createQuery(() => householdsQuery());

	let known = $derived(all.data ?? []);
	let current = $derived(known.find((household) => household.id === Number(page.params.id)));
	let household = $derived(current ?? landing(known));

	afterNavigate(() => {
		if (current) remember(current.id);
	});
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
		<div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
			{@render children()}
		</div>
	</div>
	<BottomNav household={household?.id} />
</div>
