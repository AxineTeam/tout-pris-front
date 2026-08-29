<script lang="ts">
	import InvitationAcceptance from '$lib/components/InvitationAcceptance.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	let key = $derived(params.key);
</script>

<svelte:head><title>{m.title_invitation()}</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>{m.invitation_title()}</Card.Title>
		<Card.Description>{m.invitation_intro()}</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-4">
		<InvitationAcceptance token={key} />
	</Card.Content>
</Card.Root>
