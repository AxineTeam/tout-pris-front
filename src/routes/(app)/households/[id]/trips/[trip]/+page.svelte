<script lang="ts">
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Menu from '$lib/components/Menu.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TripLines, { type Sorting } from '$lib/components/TripLines.svelte';
	import TripProgress from '$lib/components/TripProgress.svelte';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { itemsQuery, tripLinesQuery, tripQuery } from '$lib/query.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const client = useQueryClient();
	const trip = createQuery(() => tripQuery(data.household.id, data.trip));
	const lines = createQuery(() => tripLinesQuery(data.household.id, data.trip));
	const items = createQuery(() => itemsQuery(data.household.id));

	let sorted = $state<Sorting>('order');

	let sortings = $derived<{ key: Sorting; label: string }[]>([
		{ key: 'order', label: m.trip_sort_order() },
		{ key: 'name', label: m.trip_sort_name() },
		{ key: 'progress', label: m.trip_sort_progress() }
	]);

	let known = $derived(lines.data ?? []);
	let going = $derived((trip.data?.participants ?? []).map((one) => one.person));
	let ready = $derived(known.filter((line) => line.status.progress === 'done').length);

	let back = $derived(resolve('/(app)/households/[id]/trips', { id: String(data.household.id) }));

	let subtitle = $derived(
		trip.data
			? known.length > 0
				? m.trip_subtitle({ date: locale.day(trip.data.date), done: ready, total: known.length })
				: locale.day(trip.data.date)
			: undefined
	);

	async function reload() {
		await client.invalidateQueries({
			queryKey: tripLinesQuery(data.household.id, data.trip).queryKey
		});
	}
</script>

<svelte:head><title>{trip.data?.name ?? m.trip_title()}</title></svelte:head>

<ScreenHeader
	title={trip.data?.name ?? m.trip_title()}
	{subtitle}
	{back}
	actions={[
		{
			label: m.trip_edit(),
			icon: PencilIcon,
			onclick: () =>
				goto(
					resolve('/(app)/households/[id]/trips/[trip]/edit', {
						id: String(data.household.id),
						trip: String(data.trip)
					})
				)
		}
	]}
>
	{#snippet extra()}
		<Menu
			label={m.trip_sort()}
			align="right"
			triggerClass="border-border bg-card text-primary hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 active:bg-primary/25 flex size-[34px] items-center justify-center rounded-md border transition-colors outline-none focus-visible:ring-[3px]"
		>
			{#snippet trigger()}
				<ArrowUpDownIcon size={16} aria-hidden="true" />
			{/snippet}

			{#snippet children(close: () => void)}
				<span
					class="text-muted-foreground px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-[0.08em] uppercase"
				>
					{m.trip_sort()}
				</span>
				{#each sortings as sorting (sorting.key)}
					<button
						type="button"
						role="menuitemradio"
						aria-checked={sorted === sorting.key}
						onclick={() => {
							sorted = sorting.key;
							close();
						}}
						class="hover:bg-accent focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]"
					>
						<span class="text-primary flex w-4 flex-none">
							{#if sorted === sorting.key}
								<CheckIcon size={15} aria-hidden="true" />
							{/if}
						</span>
						{sorting.label}
					</button>
				{/each}
			{/snippet}
		</Menu>
	{/snippet}
</ScreenHeader>

<TripProgress lines={known} />

<TripLines
	household={data.household.id}
	trip={data.trip}
	lines={known}
	participants={going}
	items={items.data ?? []}
	{sorted}
	onchanged={reload}
/>
