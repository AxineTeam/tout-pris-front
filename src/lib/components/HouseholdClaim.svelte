<script lang="ts">
	import { claimPerson, createPerson, type Household, type Member, type Person } from '$lib/api.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Section from '$lib/components/Section.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		persons,
		members,
		onchanged
	}: {
		household: Household;
		persons: Person[];
		members: Member[];
		onchanged: () => void;
	} = $props();

	const claiming = new Submission();
	const inventing = new Submission();
	let creating = $state(false);
	let typed = $state('');

	let me = $derived(session.user?.id);
	let free = $derived(persons.filter((person) => person.user === null));
	let taken = $derived(persons.filter((person) => person.user !== null));
	let accounts = $derived(new Map(members.map((member) => [member.user, member])));
	let newcomers = $derived(
		members.filter(
			(member) => member.user !== me && !persons.some((person) => person.user === member.user)
		)
	);

	function act(submission: Submission, call: () => Promise<unknown>) {
		submission.run(async () => {
			try {
				await call();
				creating = false;
			} finally {
				onchanged();
			}
			return [];
		});
	}

	function invent(event: SubmitEvent) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		act(inventing, async () => {
			const person = await createPerson(household.id, name);
			await claimPerson(household.id, person.id);
		});
	}
</script>

<Section>
	<div
		class="bg-pending text-pending-foreground grid gap-1 rounded-xl px-4 py-3"
		data-testid="claim"
	>
		<p class="text-sm font-semibold">{m.claim_question()}</p>
		<p class="text-sm">{m.claim_consequence()}</p>
	</div>

	<FormErrors errors={claiming.errors} />

	<ul class="grid min-w-0 gap-2" data-testid="claimable">
		{#each free as person (person.id)}
			<li>
				<RowCard
					aria-label={m.person_claim({ name: person.name })}
					disabled={claiming.busy}
					onclick={() => act(claiming, () => claimPerson(household.id, person.id))}
				>
					<PersonAvatar id={person.id} name={person.name} />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-semibold">{person.name}</span>
						<span class="text-muted-foreground block truncate text-xs">{m.person_no_account()}</span
						>
					</span>
				</RowCard>
			</li>
		{/each}
	</ul>

	<AddCard
		label={m.claim_create()}
		onclick={() => {
			inventing.errors = [];
			typed = '';
			creating = true;
		}}
	/>
</Section>

<Section class="opacity-60" data-testid="claim-rest" inert>
	<h2 class="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
		{m.claim_rest()}
	</h2>
	<ul class="grid min-w-0 gap-2">
		{#each taken as person (person.id)}
			{@const account = person.user === null ? undefined : accounts.get(person.user)}
			<li
				class="border-border bg-card flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5"
			>
				<PersonAvatar id={person.id} name={person.name} />
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold">{person.name}</span>
					<span class="text-muted-foreground block truncate text-xs">{account?.email}</span>
				</span>
				{#if account?.role === 'owner'}
					<span
						class="bg-primary text-primary-foreground flex-none rounded-full px-2 py-0.5 text-[10px]"
					>
						{m.role_owner()}
					</span>
				{/if}
			</li>
		{/each}
		{#each newcomers as newcomer (newcomer.id)}
			<li
				class="border-border text-muted-foreground flex min-w-0 items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
			>
				<span aria-hidden="true" class="bg-muted size-9 flex-none rounded-full"></span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm">{newcomer.email}</span>
					<span class="block truncate text-xs">{m.newcomer_note()}</span>
				</span>
			</li>
		{/each}
	</ul>
</Section>

{#if creating}
	<Modal title={m.claim_create()} onclose={() => (creating = false)}>
		<FormErrors errors={inventing.errors} />
		<form class="grid gap-4" onsubmit={invent}>
			<div class="grid gap-2">
				<Label for="claimed-name">{m.claim_create_label()}</Label>
				<Input id="claimed-name" bind:value={typed} />
			</div>
			<Button type="submit" disabled={inventing.busy || typed.trim().length === 0}>
				{m.create()}
			</Button>
		</form>
	</Modal>
{/if}
