<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button/index.js';

	// The buttons are drawn at 32 px and widened by a pseudo-element, so the
	// control stops dwarfing the name beside it without becoming a small target.
	// `tight` is for the rows that leave it no room — the person rows of the two
	// list screens, which stand 36 px — where the halo stops at the row's edge
	// rather than reaching over the line below and taking its taps. Left alone,
	// it keeps the 44 px it reaches in a row with room to spare.
	let {
		quantity,
		less,
		more,
		busy = false,
		tight = false,
		onless,
		onmore
	}: {
		quantity: number;
		less: string;
		more: string;
		busy?: boolean;
		tight?: boolean;
		onless: () => void;
		onmore: () => void;
	} = $props();

	let reach = $derived(tight ? 'after:-inset-y-0.5' : 'after:-inset-y-1.5');
</script>

<span class="border-border mx-1 flex flex-none items-center rounded-lg border">
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label={less}
		disabled={busy}
		onclick={onless}
		class={[
			'text-primary relative rounded-r-none after:absolute after:-inset-x-1.5',
			reach,
			"after:content-['']"
		]}
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
		class={[
			'text-primary relative rounded-l-none after:absolute after:-inset-x-1.5',
			reach,
			"after:content-['']"
		]}
	>
		<PlusIcon class="size-[13px]" aria-hidden="true" />
	</Button>
</span>
