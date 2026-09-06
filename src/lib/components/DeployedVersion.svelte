<script lang="ts">
	import { apiBuild, build } from '$lib/build.js';
</script>

<!-- The API gives its commit to administrators only (`tout_pris/views.py`,
     `commit=settings.APP_COMMIT if request.user.is_staff else None`), so the front
     has no way to know it and follows what the API was willing to say. -->
{#snippet front(staff: boolean)}
	front {build.version}{#if staff}&nbsp;({build.commit}){/if}
{/snippet}

<p class="text-muted-foreground text-xs" data-testid="deployed-version">
	{#await apiBuild()}
		{@render front(false)}
	{:then api}
		{@render front(!!api.commit)}
		{#if api.version}
			· API {api.version}{#if api.commit}&nbsp;({api.commit}){/if}
		{/if}
	{:catch}
		{@render front(false)}
	{/await}
</p>
