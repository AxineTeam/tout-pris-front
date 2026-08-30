<script lang="ts">
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.title_kits()}</title></svelte:head>

<ScreenHeader title={m.kits_title()} switcher />
<p class="text-muted-foreground text-sm" data-testid="kits-empty">{m.kits_empty()}</p>
