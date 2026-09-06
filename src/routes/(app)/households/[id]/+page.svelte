<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import HouseholdClaim from '$lib/components/HouseholdClaim.svelte';
	import HouseholdInvitations from '$lib/components/HouseholdInvitations.svelte';
	import HouseholdPeople from '$lib/components/HouseholdPeople.svelte';
	import HouseholdSettings from '$lib/components/HouseholdSettings.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import { householdLabel, isOwner } from '$lib/households.js';
	import * as m from '$lib/paraglide/messages.js';
	import {
		householdKey,
		householdsQuery,
		invitationsQuery,
		peopleQuery,
		queryClient,
		statusesQuery
	} from '$lib/query.js';
	import { session } from '$lib/session.svelte.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The household comes from the query and not from the `load`: it is renamed
	// here, and without `invalidateAll` the `load` no longer replays to refresh
	// its name.
	const all = createQuery(() => householdsQuery());
	let household = $derived(
		(all.data ?? []).find((known) => known.id === data.household.id) ?? data.household
	);

	const statuses = createQuery(() => statusesQuery(household.id));
	const people = createQuery(() => ({
		...peopleQuery(household.id),
		enabled: !household.personal
	}));

	let persons = $derived(people.data?.persons ?? []);
	let members = $derived(people.data?.members ?? []);
	let label = $derived(householdLabel(household));
	let me = $derived(session.user?.id);
	let owner = $derived(isOwner(members, me));

	const invitations = createQuery(() => ({ ...invitationsQuery(household.id), enabled: owner }));

	// `people.isSuccess` and not the empty list: as long as the query has
	// answered nothing, an empty list would read as “nobody” and the screen would
	// tell a member they are not part of the household.
	let nobody = $derived(
		!household.personal && people.isSuccess && !persons.some((person) => person.user === me)
	);

	function refresh() {
		queryClient.invalidateQueries({ queryKey: householdKey(household.id) });
	}
</script>

<svelte:head><title>{m.title_household({ name: label })}</title></svelte:head>

<ScreenHeader title={m.nav_household()} switcher />

{#if !household.personal}
	{#if nobody}
		<HouseholdClaim {household} {persons} {members} onchanged={refresh} />
	{:else}
		<HouseholdPeople {household} {persons} {members} {owner} onchanged={refresh} />
		{#if owner}
			<HouseholdInvitations
				household={household.id}
				invitations={invitations.data ?? []}
				onchanged={refresh}
			/>
		{/if}
	{/if}
{/if}

{#if !nobody}
	<HouseholdSettings {household} statuses={statuses.data ?? []} {owner} onchanged={refresh} />
{/if}
