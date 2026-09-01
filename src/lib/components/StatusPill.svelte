<script lang="ts">
	import type { ItemStatus } from '$lib/api.js';

	// The household picks the colour, so the label keeps the page's ink and only
	// the ground is tinted: a pale amber and a deep green both stay readable,
	// which a label drawn in the household's own colour would not.
	let {
		status,
		label,
		busy = false,
		onadvance
	}: {
		status: ItemStatus;
		label: string;
		busy?: boolean;
		onadvance?: () => void;
	} = $props();
</script>

{#if onadvance}
	<button
		type="button"
		aria-label={label}
		disabled={busy}
		onclick={onadvance}
		style:background-color="color-mix(in oklab, {status.color} 16%, transparent)"
		class="focus-visible:ring-ring/50 relative flex h-7 min-w-0 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-opacity outline-none after:absolute after:-inset-y-2 after:-inset-x-1 after:content-[''] hover:opacity-80 focus-visible:ring-[3px] disabled:opacity-50"
	>
		<span
			aria-hidden="true"
			class="size-[9px] flex-none rounded-full"
			style:background-color={status.color}
		></span>
		<span class="truncate">{status.name}</span>
	</button>
{:else}
	<span
		style:background-color="color-mix(in oklab, {status.color} 16%, transparent)"
		class="flex h-7 min-w-0 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
	>
		<span
			aria-hidden="true"
			class="size-[9px] flex-none rounded-full"
			style:background-color={status.color}
		></span>
		<span class="truncate">{status.name}</span>
	</span>
{/if}
