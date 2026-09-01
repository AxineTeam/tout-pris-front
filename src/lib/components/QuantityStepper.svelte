<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button/index.js';

	// The buttons are drawn at 32 px and reach 44 through the pseudo-element, so
	// the control stops dwarfing the name beside it without becoming a small
	// target. Both list screens step a quantity, and they step it the same way.
	let {
		quantity,
		less,
		more,
		busy = false,
		onless,
		onmore
	}: {
		quantity: number;
		less: string;
		more: string;
		busy?: boolean;
		onless: () => void;
		onmore: () => void;
	} = $props();
</script>

<span class="border-border mx-1 flex flex-none items-center rounded-lg border">
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={less}
		disabled={busy}
		onclick={onless}
		class="text-primary relative rounded-r-none after:absolute after:-inset-1.5 after:content-['']"
	>
		<MinusIcon class="size-[13px]" aria-hidden="true" />
	</Button>
	<span class="min-w-5 text-center text-[13px] font-semibold">{quantity}</span>
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={more}
		disabled={busy}
		onclick={onmore}
		class="text-primary relative rounded-l-none after:absolute after:-inset-1.5 after:content-['']"
	>
		<PlusIcon class="size-[13px]" aria-hidden="true" />
	</Button>
</span>
