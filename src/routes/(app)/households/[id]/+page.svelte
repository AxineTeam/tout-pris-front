<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import HouseholdClaim from '$lib/components/HouseholdClaim.svelte';
	import HouseholdInvitations from '$lib/components/HouseholdInvitations.svelte';
	import HouseholdPeople from '$lib/components/HouseholdPeople.svelte';
	import HouseholdSettings from '$lib/components/HouseholdSettings.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { householdLabel, isOwner } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let label = $derived(householdLabel(data.household));
	let me = $derived(session.user?.id);
	let owner = $derived(isOwner(data.members, me));
	let nobody = $derived(
		!data.household.personal && !data.persons.some((person) => person.user === me)
	);
</script>

<svelte:head><title>{m.title_household({ name: label })}</title></svelte:head>

<ScreenHeader title={m.nav_household()} switcher />

{#if !data.household.personal}
	{#if nobody}
		<HouseholdClaim
			household={data.household}
			persons={data.persons}
			members={data.members}
			onchanged={invalidateAll}
		/>
	{:else}
		<HouseholdPeople
			household={data.household}
			persons={data.persons}
			members={data.members}
			{owner}
			onchanged={invalidateAll}
		/>
		{#if owner}
			<HouseholdInvitations
				household={data.household.id}
				invitations={data.invitations}
				onchanged={invalidateAll}
			/>
		{/if}
	{/if}
{/if}

<HouseholdSettings
	household={data.household}
	statuses={data.statuses}
	owner={owner && !nobody}
	onchanged={invalidateAll}
/>
