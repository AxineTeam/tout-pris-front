<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { type Household } from '$lib/api.js';
	import HouseholdCreation from '$lib/components/HouseholdCreation.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { householdLabel } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';

	let { all, current }: { all: Household[]; current: Household } = $props();

	let creating = $state(false);

	type Section =
		'/(app)/households/[id]' | '/(app)/households/[id]/trips' | '/(app)/households/[id]/kits';

	let section = $derived<Section>(
		page.url.pathname.endsWith('/trips')
			? '/(app)/households/[id]/trips'
			: page.url.pathname.endsWith('/kits')
				? '/(app)/households/[id]/kits'
				: '/(app)/households/[id]'
	);
</script>

<Menu
	label={m.household_switch()}
	triggerClass="border-border bg-card text-foreground flex min-h-[34px] w-fit max-w-full items-center gap-1.5 rounded-full border py-1.5 pr-2.5 pl-3 text-[12.5px] font-medium"
>
	{#snippet trigger()}
		<span class="truncate" data-testid="household-switcher">{householdLabel(current)}</span>
		<ChevronDownIcon size={14} aria-hidden="true" class="text-muted-foreground flex-none" />
	{/snippet}

	{#snippet children(close: () => void)}
		{#each all as household (household.id)}
			<a
				role="menuitem"
				href={resolve(section, { id: String(household.id) })}
				onclick={close}
				aria-current={household.id === current.id ? 'page' : undefined}
				class="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium"
			>
				<span class="text-primary flex w-4 flex-none">
					{#if household.id === current.id}
						<CheckIcon size={15} aria-hidden="true" />
					{/if}
				</span>
				<span class="truncate">{householdLabel(household)}</span>
			</a>
		{/each}

		<div class="bg-border mx-2 my-1 h-px"></div>

		<button
			type="button"
			role="menuitem"
			onclick={() => {
				close();
				creating = true;
			}}
			class="text-primary flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium"
		>
			<span class="flex w-4 flex-none"><PlusIcon size={15} aria-hidden="true" /></span>
			{m.household_new()}
		</button>
	{/snippet}
</Menu>

{#if creating}
	<Modal title={m.household_new()} onclose={() => (creating = false)}>
		<HouseholdCreation oncreated={() => (creating = false)} />
	</Modal>
{/if}
