<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		deleteTrip,
		duplicateTrip,
		fieldErrors,
		formErrors,
		updateTrip,
		type Trip
	} from '$lib/api.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FieldErrors from '$lib/components/FieldErrors.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import Section from '$lib/components/Section.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	type Opened = { kind: 'duplicate'; trip: Trip } | { kind: 'remove'; trip: Trip };

	let {
		household,
		trips,
		archived,
		onchanged
	}: { household: number; trips: Trip[]; archived: Trip[]; onchanged: () => void } = $props();

	const submission = new Submission();
	let opened = $state.raw<Opened | null>(null);
	let named = $state('');
	let dated = $state('');

	let nameErrors = $derived(fieldErrors(submission.errors, 'name'));
	let dateErrors = $derived(fieldErrors(submission.errors, 'date'));
	let otherErrors = $derived(formErrors(submission.errors, 'name', 'date'));
	let ready = $derived(named.trim().length > 0 && dated.length > 0 && !submission.busy);

	function open(next: Opened, name = '') {
		submission.errors = [];
		named = name;
		dated = locale.today();
		opened = next;
	}

	function act(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			opened = null;
			onchanged();
			return [];
		});
	}

	function copy(event: SubmitEvent, trip: Trip) {
		event.preventDefault();
		if (ready) act(() => duplicateTrip(household, trip.id, named.trim(), dated));
	}
</script>

{#snippet separator()}
	<div class="bg-border mx-2 my-1 h-px"></div>
{/snippet}

{#snippet entry(icon: LucideIcon, text: string, onclick: () => void, danger = false)}
	{@const Icon = icon}
	<button
		type="button"
		role="menuitem"
		disabled={submission.busy}
		{onclick}
		class={[
			'hover:bg-accent focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
			danger && 'text-destructive'
		]}
	>
		<Icon size={16} aria-hidden="true" class="flex-none" />
		{text}
	</button>
{/snippet}

{#snippet row(trip: Trip, filed: boolean)}
	<li data-testid="trip-{trip.id}" class="min-w-0">
		<RowCard
			href={resolve('/(app)/households/[id]/trips/[trip]', {
				id: String(household),
				trip: String(trip.id)
			})}
		>
			<span class="min-w-0 flex-1">
				<span class="block truncate text-sm font-semibold">{trip.name}</span>
				<span class="text-muted-foreground block truncate text-xs">
					{filed
						? locale.day(trip.date)
						: m.trip_when({ date: locale.day(trip.date), until: locale.until(trip.date) })}
				</span>
			</span>

			{#snippet actions()}
				<Menu
					label={m.trip_actions({ name: trip.name })}
					align="right"
					triggerClass="text-muted-foreground relative z-10 -my-1 flex size-11 flex-none items-center justify-center"
				>
					{#snippet trigger()}
						<EllipsisIcon size={18} aria-hidden="true" />
					{/snippet}

					{#snippet children(close: () => void)}
						{#if filed}
							{@render entry(ArchiveRestoreIcon, m.trip_unarchive(), () => {
								close();
								act(() => updateTrip(household, trip.id, { archived: false }));
							})}
						{:else}
							{@render entry(ArchiveIcon, m.trip_archive(), () => {
								close();
								act(() => updateTrip(household, trip.id, { archived: true }));
							})}
						{/if}
						{@render entry(CopyIcon, m.trip_duplicate(), () => {
							close();
							open({ kind: 'duplicate', trip }, m.trip_copy_name({ name: trip.name }));
						})}
						{@render separator()}
						{@render entry(
							TrashIcon,
							m.delete(),
							() => {
								close();
								open({ kind: 'remove', trip });
							},
							true
						)}
					{/snippet}
				</Menu>
				<ChevronRightIcon size={16} aria-hidden="true" class="text-muted-foreground flex-none" />
			{/snippet}
		</RowCard>
	</li>
{/snippet}

{#snippet fields()}
	<FormErrors errors={otherErrors} />
	<div class="grid gap-2">
		<Label for="trip-name">{m.trip_name_label()}</Label>
		<Input
			id="trip-name"
			aria-invalid={nameErrors.length > 0}
			aria-describedby={nameErrors.length > 0 ? 'trip-name-errors' : undefined}
			bind:value={named}
		/>
		<FieldErrors id="trip-name-errors" errors={nameErrors} />
	</div>
	<div class="grid gap-2">
		<Label for="trip-date">{m.trip_date_label()}</Label>
		<Input
			id="trip-date"
			type="date"
			aria-invalid={dateErrors.length > 0}
			aria-describedby={dateErrors.length > 0 ? 'trip-date-errors' : undefined}
			bind:value={dated}
		/>
		<FieldErrors id="trip-date-errors" errors={dateErrors} />
	</div>
{/snippet}

<div class="grid gap-4">
	{#if trips.length === 0 && archived.length === 0}
		<p class="text-muted-foreground text-sm" data-testid="trips-empty">{m.trips_empty()}</p>
	{/if}

	{#if opened === null}
		<FormErrors errors={submission.errors} />
	{/if}

	<ul class="grid min-w-0 gap-2">
		{#each trips as trip (trip.id)}
			{@render row(trip, false)}
		{/each}
		<li>
			<AddCard
				label={m.trip_new()}
				onclick={() => goto(resolve('/(app)/households/[id]/trips/new', { id: String(household) }))}
			/>
		</li>
	</ul>

	{#if archived.length > 0}
		<Section title={m.trips_archived()} data-testid="trips-archived">
			<ul class="grid min-w-0 gap-2">
				{#each archived as trip (trip.id)}
					{@render row(trip, true)}
				{/each}
			</ul>
		</Section>
	{/if}
</div>

{#if opened?.kind === 'duplicate'}
	{@const trip = opened.trip}
	<Modal title={m.trip_duplicate_title({ name: trip.name })} onclose={() => (opened = null)}>
		<p class="text-muted-foreground text-sm">{m.trip_duplicate_explains()}</p>
		<form class="grid gap-4" onsubmit={(event) => copy(event, trip)} novalidate>
			{@render fields()}
			<Button type="submit" disabled={!ready}>{m.trip_duplicate()}</Button>
		</form>
	</Modal>
{:else if opened?.kind === 'remove'}
	{@const trip = opened.trip}
	<Modal title={m.trip_delete_title({ name: trip.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.trip_delete_explains()}</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => act(() => deleteTrip(household, trip.id))}
		>
			{m.delete_it()}
		</Button>
	</Modal>
{/if}
