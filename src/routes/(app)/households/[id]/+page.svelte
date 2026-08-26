<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HouseholdInvitations from '$lib/components/HouseholdInvitations.svelte';
	import HouseholdPeople from '$lib/components/HouseholdPeople.svelte';
	import HouseholdSettings from '$lib/components/HouseholdSettings.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { householdLabel, isOwner } from '$lib/households.svelte.js';
	import { session } from '$lib/session.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let label = $derived(householdLabel(data.household));
	let amOwner = $derived(isOwner(data.members, session.user?.id));
</script>

<svelte:head><title>{label} — Tout Pris</title></svelte:head>

<div class="space-y-6">
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

	<Card.Root>
		<Card.Header>
			<Card.Title>Les personnes</Card.Title>
			<Card.Description>
				Tout ce que prépare l’application est pour quelqu’un. Un enfant est une personne sans
				compte, un partenaire une personne dont le compte a rejoint le foyer.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<HouseholdPeople
				household={data.household}
				persons={data.persons}
				members={data.members}
				onchanged={invalidateAll}
			/>
		</Card.Content>
	</Card.Root>

	{#if !data.household.personal}
		<Card.Root>
			<Card.Header>
				<Card.Title>Les invitations</Card.Title>
				<Card.Description>
					Un lien valable une semaine, envoyé à une adresse. Qui l’accepte choisit ensuite la
					personne qu’il est déjà ici, ou en crée une.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<HouseholdInvitations
					household={data.household.id}
					invitations={data.invitations}
					canInvite={amOwner}
					onchanged={invalidateAll}
				/>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Le foyer</Card.Title>
				<Card.Description>
					Le renommer et le supprimer appartiennent à ses propriétaires. Le quitter laisse la
					personne que tu y étais, sans son compte.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<HouseholdSettings
					household={data.household}
					members={data.members}
					onchanged={invalidateAll}
				/>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
