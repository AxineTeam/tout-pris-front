<script lang="ts">
	import type { AuthError } from '$lib/api.js';

	let { id, errors }: { id: string; errors: AuthError[] } = $props();
</script>

{#if errors.length > 0}
	<div {id} role="alert" class="text-destructive text-xs">
		<ul class="grid gap-1">
			{#each errors as error (`${error.code}:${error.message}`)}
				<li>{error.message}</li>
			{/each}
		</ul>
	</div>
{/if}
