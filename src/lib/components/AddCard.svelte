<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';

	let { label, onclick }: { label: string; onclick: () => void } = $props();
</script>

<button
	type="button"
	{onclick}
	class="border-border text-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px]"
>
	<PlusIcon size={18} aria-hidden="true" />
	{label}
</button>
