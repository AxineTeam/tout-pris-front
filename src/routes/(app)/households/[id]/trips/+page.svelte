<script lang="ts">
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.title_trips()}</title></svelte:head>

<ScreenHeader title={m.trips_title()} />
<p class="text-muted-foreground text-sm" data-testid="trips-empty">{m.trips_empty()}</p>
