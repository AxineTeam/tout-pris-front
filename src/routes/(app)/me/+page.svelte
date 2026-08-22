<script lang="ts">
	import { resolve } from '$app/paths';
	import { authErrors, changePassword } from '$lib/api.js';
	import EmailAddresses from '$lib/components/EmailAddresses.svelte';
	import PasswordChangeForm from '$lib/components/PasswordChangeForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { households } from '$lib/households.svelte.js';
	import { session } from '$lib/session.svelte.js';

	let landing = $derived(households.landing);

	async function change(current: string, renewed: string) {
		return authErrors(await changePassword(current, renewed));
	}
</script>

<svelte:head><title>Mon compte — Tout Pris</title></svelte:head>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Mon compte</Card.Title>
			<Card.Description data-testid="account-display">{session.user?.display}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-muted-foreground text-sm">
				Le nom que voient les autres membres est celui de la personne qui te représente dans chaque
				foyer, pas un champ du compte : il se change
				{#if landing}
					<a class="underline" href={resolve('/(app)/households/[id]', { id: String(landing.id) })}>
						sur l’écran du foyer
					</a>
				{:else}
					sur l’écran du foyer
				{/if}
				.
			</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Adresses email</Card.Title>
			<Card.Description>
				L’adresse principale est celle qui te connecte. Une adresse ajoutée reste inutilisable tant
				que son lien de vérification n’a pas été suivi.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<EmailAddresses />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Mot de passe</Card.Title>
			<Card.Description>
				Le mot de passe actuel est demandé : une session volée ne doit pas suffire à le changer.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<PasswordChangeForm onsubmit={change} />
		</Card.Content>
	</Card.Root>
</div>
