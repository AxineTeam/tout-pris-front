<script lang="ts">
	import { resolve } from '$app/paths';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { authErrors } from '$lib/api.js';
	import { session, verificationPending } from '$lib/session.svelte.js';

	let pending = $state(false);

	async function submit(email: string, password: string) {
		const response = await session.signUp(email, password);
		const errors = authErrors(response);
		pending = errors.length === 0 && verificationPending(response);
		return errors;
	}
</script>

<svelte:head><title>Inscription — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>Créer un compte</Card.Title>
		<Card.Description>Une adresse email et un mot de passe suffisent.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if pending}
			<p data-testid="verification-pending">
				Compte créé. Un email de vérification vient de partir : suis son lien pour activer ton
				compte.
			</p>
		{:else}
			<CredentialsForm
				submitLabel="Créer mon compte"
				passwordAutocomplete="new-password"
				onsubmit={submit}
			/>
		{/if}
	</Card.Content>
	<Card.Footer>
		<p class="text-muted-foreground text-sm">
			Déjà un compte ?
			<a class="underline" href={resolve('/account/login')}>Se connecter</a>
		</p>
	</Card.Footer>
</Card.Root>
