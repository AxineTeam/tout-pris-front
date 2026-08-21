<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { householdLabel } from '$lib/households.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let label = $derived(householdLabel(data.household));
</script>

<svelte:head><title>{label} — Tout Pris</title></svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title data-testid="household-name">{label}</Card.Title>
		<Card.Description>
			{data.household.personal
				? 'Ton espace à toi : ce que tu prépares sans le partager.'
				: 'Un foyer partagé avec ses membres.'}
		</Card.Description>
	</Card.Header>
</Card.Root>
