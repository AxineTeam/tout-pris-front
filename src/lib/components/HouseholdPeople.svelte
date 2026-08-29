<script lang="ts">
	import {
		claimPerson,
		createPerson,
		deletePerson,
		removeMember,
		renamePerson,
		setMemberRole,
		type Household,
		type Member,
		type Person
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { isOwner } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';
	import { session } from '$lib/session.svelte.js';

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

	const submission = new Submission();
	let added = $state('');
	let renaming = $state<number | null>(null);
	let renamed = $state('');

	let me = $derived(session.user?.id);
	let iAmOwner = $derived(isOwner(members, me));
	let iAmNobody = $derived(!household.personal && !persons.some((person) => person.user === me));
	let accounts = $derived(new Map(members.map((member) => [member.user, member])));
	let strangers = $derived(
		members.filter((member) => !persons.some((person) => person.user === member.user))
	);
	let canAdd = $derived(added.trim().length > 0 && !submission.busy);

	function act(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			onchanged();
			return [];
		});
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!canAdd) return;
		const name = added.trim();
		act(async () => {
			await createPerson(household.id, name);
			added = '';
		});
	}

	function startRenaming(person: Person) {
		renaming = person.id;
		renamed = person.name;
	}

	function rename(event: SubmitEvent) {
		event.preventDefault();
		const name = renamed.trim();
		const person = renaming;
		if (!name || person === null) return;
		act(async () => {
			await renamePerson(household.id, person, name);
			renaming = null;
		});
	}
</script>

<div class="grid gap-4">
	<FormErrors errors={submission.errors} />

	{#if iAmNobody}
		<p class="rounded-md border border-dashed px-3 py-2 text-sm" data-testid="claim-invite">
			{m.person_claim_prompt()}
		</p>
	{/if}

	<ul class="grid gap-2" data-testid="persons">
		{#each persons as person (person.id)}
			{@const account = person.user === null ? undefined : accounts.get(person.user)}
			<li class="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
				{#if renaming === person.id}
					<form class="flex flex-1 items-end gap-2" onsubmit={rename}>
						<div class="grid flex-1 gap-2">
							<Label for="rename-{person.id}">{m.person_rename_label({ name: person.name })}</Label>
							<Input id="rename-{person.id}" bind:value={renamed} />
						</div>
						<Button type="submit" size="sm" disabled={submission.busy}>{m.save()}</Button>
						<Button variant="ghost" size="sm" onclick={() => (renaming = null)}>{m.cancel()}</Button
						>
					</form>
				{:else}
					<span class="text-sm">{person.name}</span>
					{#if account}
						<span class="text-muted-foreground text-xs">{account.email}</span>
						{#if account.role === 'owner'}
							<span class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
								{m.role_owner()}
							</span>
						{/if}
					{:else}
						<span class="text-muted-foreground text-xs">{m.person_no_account()}</span>
					{/if}
					<span class="ml-auto flex flex-wrap gap-2">
						{#if iAmNobody && !person.user}
							<Button
								variant="outline"
								size="sm"
								onclick={() => act(() => claimPerson(household.id, person.id))}
							>
								{m.person_claim({ name: person.name })}
							</Button>
						{/if}
						<Button variant="outline" size="sm" onclick={() => startRenaming(person)}>
							{m.person_rename({ name: person.name })}
						</Button>
						{#if account && iAmOwner && account.user !== me}
							<Button
								variant="outline"
								size="sm"
								onclick={() => act(() => setMemberRole(household.id, account.id, 'owner'))}
								disabled={account.role === 'owner'}
							>
								{m.person_make_owner({ name: person.name })}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => act(() => removeMember(household.id, account.id))}
							>
								{m.person_remove_account({ name: person.name })}
							</Button>
						{/if}
						<Button
							variant="outline"
							size="sm"
							onclick={() => act(() => deletePerson(household.id, person.id))}
						>
							{m.person_delete({ name: person.name })}
						</Button>
					</span>
				{/if}
			</li>
		{/each}
	</ul>

	{#if strangers.length > 0}
		<div class="grid gap-2" data-testid="strangers">
			<p class="text-muted-foreground text-sm">{m.strangers_heading()}</p>
			<ul class="grid gap-2">
				{#each strangers as stranger (stranger.id)}
					<li class="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-2">
						<span class="text-sm">{stranger.email}</span>
						{#if iAmOwner && stranger.user !== me}
							<Button
								variant="outline"
								size="sm"
								class="ml-auto"
								onclick={() => act(() => removeMember(household.id, stranger.id))}
							>
								{m.stranger_remove({ email: stranger.email })}
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<form class="flex items-end gap-3" onsubmit={add}>
		<div class="grid flex-1 gap-2">
			<Label for="new-person">{m.person_add_label()}</Label>
			<Input id="new-person" bind:value={added} />
		</div>
		<Button type="submit" disabled={!canAdd}>{m.add()}</Button>
	</form>
</div>
