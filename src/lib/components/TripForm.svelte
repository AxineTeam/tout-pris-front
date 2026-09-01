<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		addParticipant,
		createTrip,
		embarkKit,
		fieldErrors,
		formErrors,
		removeParticipant,
		updateTrip,
		type Kit,
		type Person,
		type TripDetail
	} from '$lib/api.js';
	import FieldErrors from '$lib/components/FieldErrors.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { queryClient, tripQuery, tripsKey, tripsQuery } from '$lib/query.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		persons,
		kits,
		trip
	}: { household: number; persons: Person[]; kits: Kit[]; trip?: TripDetail } = $props();

	const submission = new Submission();
	// The form seeds itself once: a background refetch of the query must not wipe
	// out what the user is currently typing.
	let named = $state(untrack(() => trip?.name) ?? '');
	let dated = $state(untrack(() => trip?.date) ?? locale.today());
	let going = $state.raw<number[]>(
		untrack(() => trip?.participants.map((one) => one.person.id)) ?? []
	);
	let embarking = $state.raw<number[]>([]);

	let nameErrors = $derived(fieldErrors(submission.errors, 'name'));
	let dateErrors = $derived(fieldErrors(submission.errors, 'date'));
	let otherErrors = $derived(formErrors(submission.errors, 'name', 'date'));
	let ready = $derived(named.trim().length > 0 && dated.length > 0 && !submission.busy);

	function toggle(all: number[], id: number): number[] {
		return all.includes(id) ? all.filter((known) => known !== id) : [...all, id];
	}

	// Participants before kits: instantiate_kit drops a line aimed at someone who
	// is not a participant yet, silently and with a 201.
	async function amend(current: TripDetail): Promise<number> {
		await updateTrip(household, current.id, { name: named.trim(), date: dated });
		for (const one of current.participants.filter((one) => !going.includes(one.person.id))) {
			await removeParticipant(household, current.id, one.id);
		}
		const already = current.participants.map((one) => one.person.id);
		for (const person of going.filter((id) => !already.includes(id))) {
			await addParticipant(household, current.id, person);
		}
		try {
			for (const kit of embarking) {
				await embarkKit(household, current.id, kit);
			}
		} finally {
			// Each write lands on its own, so a refusal partway leaves the server
			// ahead of the cache. Invalidating on the way out costs one request and
			// keeps the screen from showing a name that is no longer the name.
			await queryClient.invalidateQueries({ queryKey: tripsKey(household) });
		}
		return current.id;
	}

	// Creation answers with the whole trip: it goes into the cache instead of
	// being asked for again, and only the two lists are invalidated — `tripsKey`
	// covers both but also prefixes the detail, which it would mark stale.
	async function build(): Promise<number> {
		const built = await createTrip(household, {
			name: named.trim(),
			date: dated,
			participants: going,
			kits: embarking
		});
		queryClient.setQueryData(tripQuery(household, built.id).queryKey, built);
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: tripsQuery(household).queryKey }),
			queryClient.invalidateQueries({ queryKey: tripsQuery(household, true).queryKey })
		]);
		return built.id;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!ready) return;
		submission.run(async () => {
			const id = trip ? await amend(trip) : await build();
			await goto(
				resolve('/(app)/households/[id]/trips/[trip]', {
					id: String(household),
					trip: String(id)
				})
			);
			return [];
		});
	}
</script>

<form class="grid gap-5" onsubmit={save} novalidate>
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

	<div class="grid gap-2">
		<span class="text-sm leading-none font-medium">{m.trip_who()}</span>
		{#if persons.length === 0}
			<p class="text-muted-foreground text-sm">{m.trip_who_none()}</p>
		{:else}
			{#if trip}
				<p class="text-muted-foreground text-xs">{m.trip_going_explains()}</p>
			{/if}
			<div role="group" aria-label={m.trip_who()} class="flex flex-wrap gap-1.5">
				{#each persons as person (person.id)}
					<button
						type="button"
						aria-label={m.trip_going({ name: person.name })}
						aria-pressed={going.includes(person.id)}
						onclick={() => (going = toggle(going, person.id))}
						class="border-border aria-pressed:border-primary aria-pressed:bg-accent hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 items-center gap-2 rounded-full border px-1.5 py-1 pr-3 text-sm transition-colors outline-none focus-visible:ring-[3px]"
					>
						<PersonAvatar id={person.id} name={person.name} small />
						{person.name}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="grid gap-2">
		<span class="text-sm leading-none font-medium">
			{trip ? m.trip_kits_more() : m.trip_kits_label()}
		</span>
		{#if kits.length === 0}
			<p class="text-muted-foreground text-sm">{m.trip_kits_none()}</p>
		{:else}
			<p class="text-muted-foreground text-xs">{m.trip_kits_explains()}</p>
			<ul class="grid min-w-0 gap-2">
				{#each kits as kit (kit.id)}
					{@const taken = embarking.includes(kit.id)}
					<li>
						<RowCard
							aria-label={m.trip_embark({ name: kit.name })}
							aria-pressed={taken}
							onclick={() => (embarking = toggle(embarking, kit.id))}
							class={taken ? 'border-primary bg-accent' : undefined}
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-semibold">{kit.name}</span>
								{#if kit.description}
									<span class="text-muted-foreground block truncate text-xs">
										{kit.description}
									</span>
								{/if}
							</span>
							{#if taken}
								<CheckIcon size={16} aria-hidden="true" class="text-primary flex-none" />
							{/if}
						</RowCard>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<Button type="submit" disabled={!ready}>{trip ? m.save() : m.create()}</Button>
</form>
