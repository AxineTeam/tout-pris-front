<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let unreachable = $derived(page.status >= 500);
</script>

<svelte:head><title>Erreur — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title data-testid="error-title">
			{unreachable ? 'Backend injoignable' : 'Page introuvable'}
		</Card.Title>
		<Card.Description data-testid="error-message">
			{page.error?.message ?? 'Une erreur est survenue.'}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Button onclick={() => location.reload()}>Réessayer</Button>
	</Card.Content>
</Card.Root>
