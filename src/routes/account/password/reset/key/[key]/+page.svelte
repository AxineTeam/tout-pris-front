<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { authErrors, readPasswordReset, resetPassword, type AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import PasswordForm from '$lib/components/PasswordForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	let { params }: PageProps = $props();
	const key = $derived(params.key);
	let keyErrors = $state.raw<AuthError[]>([]);
	let checked = $state(false);
	let done = $state(false);

	async function readKey() {
		try {
			keyErrors = authErrors(await readPasswordReset(key));
		} catch {
			keyErrors = [{ message: 'Le backend est injoignable.', code: 'unreachable' }];
		} finally {
			checked = true;
		}
	}

	async function submit(password: string) {
		const errors = authErrors(await resetPassword(key, password));
		done = errors.length === 0;
		return errors;
	}

	readKey();
</script>

<svelte:head><title>Nouveau mot de passe — Tout Pris</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>Choisir un nouveau mot de passe</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if done}
			<p data-testid="reset-done">
				Mot de passe changé.
				<a class="underline" href={resolve('/account/login')}>Se connecter</a>
			</p>
		{:else if keyErrors.length > 0}
			<FormErrors errors={keyErrors} title="Lien inutilisable" />
			<p class="text-muted-foreground text-sm">
				Ce lien a expiré ou a déjà servi.
				<a class="underline" href={resolve('/account/password/reset')}>Demandes-en un nouveau</a>.
			</p>
		{:else if checked}
			<PasswordForm submitLabel="Changer mon mot de passe" onsubmit={submit} />
		{:else}
			<p class="text-muted-foreground">Vérification du lien…</p>
		{/if}
	</Card.Content>
</Card.Root>
