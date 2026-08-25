<script lang="ts">
	import { backendBuild, build } from '$lib/build.js';
</script>

{#snippet front(commit: string | null)}
	front {build.version}{#if commit}&nbsp;({build.commit}){/if}
{/snippet}

<p class="text-muted-foreground text-xs" data-testid="deployed-version">
	{#await backendBuild()}
		{@render front(null)}
	{:then backend}
		{@render front(backend.commit ?? null)}
		{#if backend.version}
			· API {backend.version}{#if backend.commit}&nbsp;({backend.commit}){/if}
		{/if}
	{:catch}
		{@render front(null)}
	{/await}
</p>
