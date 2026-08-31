<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Props = Omit<HTMLButtonAttributes, 'children'> & {
		label: string;
		onclick: HTMLButtonAttributes['onclick'];
	};

	let { label, class: className, ...rest }: Props = $props();
</script>

<button
	type="button"
	class={cn(
		'border-border text-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
		className
	)}
	{...rest}
>
	<PlusIcon size={18} aria-hidden="true" />
	{label}
</button>
