<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { authErrors, readEmailVerification, type AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { params }: PageProps = $props();
	const key = $derived(params.key);
	const submission = new Submission();
	let address = $state<string | null>(null);
	let keyErrors = $state.raw<AuthError[]>([]);
	let confirmed = $state(false);

	async function readKey() {
		try {
			const response = await readEmailVerification(key);
			address = response.data?.user?.email ?? null;
			keyErrors = authErrors(response);
		} catch {
			keyErrors = [{ message: 'Le backend est injoignable.', code: 'unreachable' }];
		}
	}

	function confirm() {
		submission.run(async () => {
			const errors = authErrors(await session.verifyEmail(key));
			confirmed = errors.length === 0;
			return errors;
		});
	}

	readKey();
</script>

<svelte:head><title>Vérification de l’adresse — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>Vérifier ton adresse</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if confirmed}
			{#if session.authenticated}
				<p data-testid="verified-signed-in">
					Adresse confirmée, te voilà connecté.
					<a class="underline" href={resolve('/')}>Aller à l’accueil</a>
				</p>
			{:else}
				<p data-testid="verified-signed-out">
					Adresse confirmée.
					<a class="underline" href={resolve('/account/login')}>Se connecter</a>
				</p>
			{/if}
		{:else if keyErrors.length > 0}
			<FormErrors errors={keyErrors} title="Lien inutilisable" />
			<p class="text-muted-foreground text-sm">
				Ce lien a expiré ou a déjà servi. Recommence une
				<a class="underline" href={resolve('/account/signup')}>inscription</a>, ou
				<a class="underline" href={resolve('/account/login')}>connecte-toi</a> si ton compte est déjà
				actif.
			</p>
		{:else}
			<FormErrors errors={submission.errors} />
			<p>{address ? `Confirme que ${address} est bien ton adresse.` : 'Vérification du lien…'}</p>
			<Button onclick={confirm} disabled={!address || submission.busy}>Confirmer mon adresse</Button
			>
		{/if}
	</Card.Content>
</Card.Root>
