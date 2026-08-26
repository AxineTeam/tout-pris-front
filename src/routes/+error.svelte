<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cardShell, cardHeader, cardContent } from '$lib/cards.js';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<svelte:head><title>Erreur — Tout Pris</title></svelte:head>

<Card.Root class="{cardShell} mx-auto max-w-md">
	<Card.Header class={cardHeader}>
		<Card.Title data-testid="error-title">
			{page.status === 404 ? 'Page introuvable' : 'Quelque chose s’est mal passé'}
		</Card.Title>
		<Card.Description data-testid="error-message">
			{page.error?.message ?? 'Une erreur est survenue.'}
		</Card.Description>
	</Card.Header>
	<Card.Content class={cardContent}>
		<Button onclick={() => location.reload()}>Réessayer</Button>
	</Card.Content>
</Card.Root>
