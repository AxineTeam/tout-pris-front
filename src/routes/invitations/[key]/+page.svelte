<script lang="ts">
	import InvitationAcceptance from '$lib/components/InvitationAcceptance.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	let key = $derived(params.key);
</script>

<svelte:head><title>Invitation — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>Rejoindre un foyer</Card.Title>
		<Card.Description>
			Tu gardes ton foyer personnel : celui-ci s’ajoute au sélecteur, il ne remplace rien.
		</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-4">
		<InvitationAcceptance token={key} />
	</Card.Content>
</Card.Root>
