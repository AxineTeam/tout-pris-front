<script lang="ts">
	import HouseholdCreation from '$lib/components/HouseholdCreation.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as m from '$lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.title_household_new()}</title></svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title>{m.household_new()}</Card.Title>
		<Card.Description>{m.household_new_intro()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<HouseholdCreation />
	</Card.Content>
</Card.Root>
