<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let { checked = $bindable(false) }: { checked?: boolean } = $props();
</script>

<label class="text-muted-foreground flex min-h-11 items-center gap-2.5 text-sm">
	<input type="checkbox" bind:checked class="accent-primary size-4 flex-none" />
	{m.confirmation_dont_ask_again()}
</label>
