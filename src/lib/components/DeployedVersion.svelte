<script lang="ts">
	import { backendBuild, build } from '$lib/build.js';
</script>

<!-- L'API ne donne son commit qu'aux administrateurs (`tout_pris/views.py`,
     `commit=settings.APP_COMMIT if request.user.is_staff else None`) : le front
     n'a aucun moyen de le savoir, il se règle donc sur ce qu'elle a bien voulu dire. -->
{#snippet front(staff: boolean)}
	front {build.version}{#if staff}&nbsp;({build.commit}){/if}
{/snippet}

<p class="text-muted-foreground text-xs" data-testid="deployed-version">
	{#await backendBuild()}
		{@render front(false)}
	{:then backend}
		{@render front(!!backend.commit)}
		{#if backend.version}
			· API {backend.version}{#if backend.commit}&nbsp;({backend.commit}){/if}
		{/if}
	{:catch}
		{@render front(false)}
	{/await}
</p>
