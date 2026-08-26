<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { authErrors } from '$lib/api.js';
	import { returnTo } from '$lib/navigation.js';
	import { session } from '$lib/session.svelte.js';

	async function submit(email: string, password: string) {
		const response = await session.logIn(email, password);
		if (session.authenticated) await returnTo(page.url.searchParams.get('next'), resolve('/'));
		return authErrors(response);
	}
</script>

<svelte:head><title>Connexion — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>Connexion</Card.Title>
		<Card.Description>Connecte-toi avec ton adresse email.</Card.Description>
	</Card.Header>
	<Card.Content>
		<CredentialsForm
			submitLabel="Se connecter"
			passwordAutocomplete="current-password"
			onsubmit={submit}
		/>
	</Card.Content>
	<Card.Footer>
		<p class="text-muted-foreground text-sm">
			Pas encore de compte ?
			<a class="text-primary underline" href={resolve('/account/signup')}>Créer un compte</a>
			—
			<a class="text-primary underline" href={resolve('/account/password/reset')}
				>mot de passe oublié</a
			>
		</p>
	</Card.Footer>
</Card.Root>
