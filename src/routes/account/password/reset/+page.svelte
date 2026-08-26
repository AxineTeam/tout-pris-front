<script lang="ts">
	import { resolve } from '$app/paths';
	import { authErrors, requestPasswordReset } from '$lib/api.js';
	import EmailForm from '$lib/components/EmailForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cardShell, cardHeader, cardContent, cardFooter } from '$lib/cards.js';

	let sent = $state(false);

	async function submit(email: string) {
		const errors = authErrors(await requestPasswordReset(email));
		sent = errors.length === 0;
		return errors;
	}
</script>

<svelte:head><title>Mot de passe oublié — Tout Pris</title></svelte:head>

<Card.Root class="{cardShell} mx-auto max-w-md">
	<Card.Header class={cardHeader}>
		<Card.Title>Mot de passe oublié</Card.Title>
		<Card.Description>On t’envoie un lien pour en choisir un nouveau.</Card.Description>
	</Card.Header>
	<Card.Content class={cardContent}>
		{#if sent}
			<p data-testid="reset-requested">
				Si un compte utilise cette adresse, un lien vient de lui être envoyé.
			</p>
		{:else}
			<EmailForm submitLabel="Envoyer le lien" onsubmit={submit} />
		{/if}
	</Card.Content>
	<Card.Footer class={cardFooter}>
		<a class="text-primary text-sm underline" href={resolve('/account/login')}
			>Revenir à la connexion</a
		>
	</Card.Footer>
</Card.Root>
