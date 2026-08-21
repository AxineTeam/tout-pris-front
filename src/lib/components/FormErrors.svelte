<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import * as Alert from '$lib/components/ui/alert/index.js';

	let { errors, title = 'Échec' }: { errors: AuthError[]; title?: string } = $props();
</script>

{#if errors.length > 0}
	<Alert.Root variant="destructive">
		<Alert.Title>{title}</Alert.Title>
		<Alert.Description>
			<ul>
				{#each errors as error (`${error.param ?? ''}:${error.code}:${error.message}`)}
					<li>{error.message}</li>
				{/each}
			</ul>
		</Alert.Description>
	</Alert.Root>
{/if}
