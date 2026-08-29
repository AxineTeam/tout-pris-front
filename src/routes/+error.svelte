<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<svelte:head><title>{m.title_error()}</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title data-testid="error-title">
			{page.status === 404 ? m.error_not_found() : m.error_unexpected()}
		</Card.Title>
		<Card.Description data-testid="error-message">
			{page.error?.message ?? m.error_generic()}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Button onclick={() => location.reload()}>{m.retry()}</Button>
	</Card.Content>
</Card.Root>
