<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiError, acceptInvitation } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { households } from '$lib/households.svelte.js';
	import { goToLogin, loginPath } from '$lib/navigation.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { token }: { token: string } = $props();

	const submission = new Submission();
	let dead = $state(false);

	let here = $derived(resolve('/invitations/[key]', { key: token }));
	let login = $derived(loginPath(here));

	function accept() {
		submission.run(async () => {
			let joined;
			try {
				joined = await acceptInvitation(token);
			} catch (cause) {
				if (!(cause instanceof ApiError) || cause.status !== 404) throw cause;
				dead = true;
				return [];
			}
			households.reset();
			await goto(resolve('/(app)/households/[id]', { id: String(joined.id) }));
			return [];
		});
	}

	async function change() {
		await session.logOut();
		households.reset();
		await goToLogin(here);
	}
</script>

<FormErrors errors={submission.errors} title="Invitation inutilisable" />

{#if dead}
	<p class="text-sm" data-testid="invitation-dead">
		Cette invitation est inconnue, expirée, ou a déjà été acceptée — l’API ne dit pas laquelle des
		trois. Un lien vaut une semaine et ne sert qu’une fois. Demande à un propriétaire du foyer de
		t’en envoyer un nouveau.
	</p>
{:else if session.authenticated}
	<p data-testid="invitation-account">
		Tu vas rejoindre ce foyer avec le compte <strong>{session.user?.email}</strong>. Le lien ne
		vérifie pas à quelle adresse il a été envoyé : c’est bien ce compte qui deviendra membre.
	</p>
	<div class="flex flex-wrap gap-2">
		<Button onclick={accept} disabled={submission.busy}>Rejoindre ce foyer</Button>
		<Button variant="outline" onclick={change} disabled={submission.busy}>
			Utiliser un autre compte
		</Button>
	</div>
{:else}
	<p data-testid="invitation-anonymous">
		Rejoindre un foyer demande un compte. Connecte-toi si tu en as déjà un, sinon crée-le : une fois
		ton adresse confirmée, reviens sur ce lien — celui de l’email d’invitation — pour accepter.
	</p>
	<div class="flex flex-wrap gap-2">
		<Button href={login}>Se connecter</Button>
		<Button variant="outline" href={resolve('/account/signup')}>Créer un compte</Button>
	</div>
{/if}
