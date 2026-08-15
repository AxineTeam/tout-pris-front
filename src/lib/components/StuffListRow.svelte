<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { StuffList } from '$lib/api.js';

	let {
		stufflist,
		ondelete
	}: {
		stufflist: StuffList;
		ondelete?: (id: number) => void;
	} = $props();
</script>

<li class="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
	<span class="truncate font-medium">{stufflist.name}</span>
	<Button
		variant="ghost"
		size="sm"
		aria-label={`Supprimer ${stufflist.name}`}
		onclick={() => ondelete?.(stufflist.id)}
	>
		Supprimer
	</Button>
</li>
