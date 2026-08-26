<script lang="ts">
	import { apiBuild, build } from '$lib/build.js';
</script>

<!-- L'API ne donne son commit qu'aux administrateurs (`tout_pris/views.py`,
     `commit=settings.APP_COMMIT if request.user.is_staff else None`) : le front
     n'a aucun moyen de le savoir, il se règle donc sur ce qu'elle a bien voulu dire. -->
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
