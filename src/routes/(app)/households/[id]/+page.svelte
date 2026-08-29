<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HouseholdInvitations from '$lib/components/HouseholdInvitations.svelte';
	import HouseholdPeople from '$lib/components/HouseholdPeople.svelte';
	import HouseholdSettings from '$lib/components/HouseholdSettings.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { householdLabel, isOwner } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let label = $derived(householdLabel(data.household));
	let amOwner = $derived(isOwner(data.members, session.user?.id));
</script>

<svelte:head><title>{m.title_household({ name: label })}</title></svelte:head>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title data-testid="household-name">{label}</Card.Title>
			<Card.Description>
				{data.household.personal ? m.household_personal_intro() : m.household_shared_intro()}
			</Card.Description>
		</Card.Header>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.people_title()}</Card.Title>
			<Card.Description>{m.people_intro()}</Card.Description>
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
				<Card.Title>{m.invitations_title()}</Card.Title>
				<Card.Description>{m.invitations_intro()}</Card.Description>
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
				<Card.Title>{m.household_title()}</Card.Title>
				<Card.Description>{m.household_intro()}</Card.Description>
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
