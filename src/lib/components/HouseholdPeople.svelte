<script lang="ts">
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import {
		createPerson,
		deleteHousehold,
		deletePerson,
		removeMember,
		renamePerson,
		setMemberRole,
		type Household,
		type Member,
		type Person
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { leaveBehind } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	type Opened =
		| { kind: 'person'; person: Person }
		| { kind: 'newcomer'; member: Member }
		| { kind: 'add' }
		| { kind: 'rename'; person: Person }
		| { kind: 'removePerson'; person: Person }
		| { kind: 'removeMember'; member: Member; name: string }
		| { kind: 'leave' }
		| { kind: 'dissolve' };

	let {
		household,
		persons,
		members,
		owner,
		onchanged
	}: {
		household: Household;
		persons: Person[];
		members: Member[];
		owner: boolean;
		onchanged: () => void;
	} = $props();

	const submission = new Submission();
	let opened = $state.raw<Opened | null>(null);
	let typed = $state('');

	let me = $derived(session.user?.id);
	let accounts = $derived(new Map(members.map((member) => [member.user, member])));
	let newcomers = $derived(
		members.filter((member) => !persons.some((person) => person.user === member.user))
	);
	let membership = $derived(members.find((member) => member.user === me));
	let owners = $derived(members.filter((member) => member.role === 'owner').length);
	let lastOwner = $derived(membership?.role === 'owner' && owners === 1);
	let onlyMember = $derived(members.length === 1);

	function accountOf(person: Person): Member | undefined {
		return person.user === null ? undefined : accounts.get(person.user);
	}

	function open(next: Opened, filled = '') {
		submission.errors = [];
		typed = filled;
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

	function away(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			opened = null;
			await leaveBehind(household.id);
			return [];
		});
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		act(() => createPerson(household.id, name));
	}

	function rename(event: SubmitEvent, person: Person) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		act(() => renamePerson(household.id, person.id, name));
	}
</script>

{#snippet chip(text: string)}
	<span class="bg-primary text-primary-foreground flex-none rounded-full px-2 py-0.5 text-[10px]">
		{text}
	</span>
{/snippet}

<section class="grid gap-3">
	<h2 class="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
		{m.people_title()}
	</h2>

	<ul class="grid gap-2" data-testid="persons">
		{#each persons as person (person.id)}
			{@const account = accountOf(person)}
			<li>
				<button
					type="button"
					onclick={() => open({ kind: 'person', person })}
					class="border-border bg-card flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
				>
					<PersonAvatar id={person.id} name={person.name} />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-semibold">{person.name}</span>
						<span class="text-muted-foreground block truncate text-xs">
							{account ? account.email : m.person_no_account()}
						</span>
					</span>
					{#if account?.role === 'owner'}
						{@render chip(m.role_owner())}
					{/if}
					<EllipsisIcon size={18} aria-hidden="true" class="text-muted-foreground flex-none" />
				</button>
			</li>
		{/each}

		{#each newcomers as newcomer (newcomer.id)}
			<li data-testid="newcomer">
				{#if owner}
					<button
						type="button"
						onclick={() => open({ kind: 'newcomer', member: newcomer })}
						class="border-border text-muted-foreground flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left"
					>
						<span aria-hidden="true" class="bg-muted size-9 flex-none rounded-full"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm">{newcomer.email}</span>
							<span class="block truncate text-xs">{m.newcomer_note()}</span>
						</span>
						<EllipsisIcon size={18} aria-hidden="true" class="flex-none" />
					</button>
				{:else}
					<div
						class="border-border text-muted-foreground flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
					>
						<span aria-hidden="true" class="bg-muted size-9 flex-none rounded-full"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm">{newcomer.email}</span>
							<span class="block truncate text-xs">{m.newcomer_note()}</span>
						</span>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<button
		type="button"
		onclick={() => open({ kind: 'add' })}
		class="border-border text-primary flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-semibold"
	>
		<PlusIcon size={18} aria-hidden="true" />
		{m.person_add()}
	</button>
</section>

{#if opened?.kind === 'person'}
	{@const person = opened.person}
	{@const account = accountOf(person)}
	<Modal
		title={person.name}
		description={account ? account.email : m.person_no_account()}
		onclose={() => (opened = null)}
	>
		<FormErrors errors={submission.errors} />
		<div class="grid gap-2">
			<Button variant="outline" onclick={() => open({ kind: 'rename', person }, person.name)}>
				{m.rename()}
			</Button>
			{#if account && account.user === me}
				{#if onlyMember}
					<Button variant="destructive" onclick={() => open({ kind: 'dissolve' })}>
						{m.household_delete()}
					</Button>
				{:else if !lastOwner}
					<Button variant="destructive" onclick={() => open({ kind: 'leave' })}>
						{m.household_leave()}
					</Button>
				{/if}
			{:else}
				{#if account && owner}
					<Button
						variant="outline"
						disabled={submission.busy}
						onclick={() =>
							act(() =>
								setMemberRole(
									household.id,
									account.id,
									account.role === 'owner' ? 'member' : 'owner'
								)
							)}
					>
						{account.role === 'owner' ? m.role_demote() : m.role_promote()}
					</Button>
					<Button
						variant="outline"
						onclick={() => open({ kind: 'removeMember', member: account, name: person.name })}
					>
						{m.member_remove()}
					</Button>
				{/if}
				<Button variant="destructive" onclick={() => open({ kind: 'removePerson', person })}>
					{m.person_remove()}
				</Button>
			{/if}
		</div>
	</Modal>
{:else if opened?.kind === 'newcomer'}
	{@const newcomer = opened.member}
	<Modal title={newcomer.email} description={m.newcomer_note()} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => act(() => removeMember(household.id, newcomer.id))}
		>
			{m.person_remove()}
		</Button>
	</Modal>
{:else if opened?.kind === 'add'}
	<Modal title={m.person_add()} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={add}>
			<div class="grid gap-2">
				<Label for="person-name">{m.person_name_label()}</Label>
				<Input id="person-name" bind:value={typed} />
			</div>
			<Button type="submit" disabled={submission.busy || typed.trim().length === 0}>
				{m.add()}
			</Button>
		</form>
	</Modal>
{:else if opened?.kind === 'rename'}
	{@const person = opened.person}
	<Modal title={m.person_rename({ name: person.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={(event) => rename(event, person)}>
			<div class="grid gap-2">
				<Label for="person-renamed">{m.person_rename_label({ name: person.name })}</Label>
				<Input id="person-renamed" bind:value={typed} />
			</div>
			<Button type="submit" disabled={submission.busy || typed.trim().length === 0}>
				{m.save()}
			</Button>
		</form>
	</Modal>
{:else if opened?.kind === 'removePerson'}
	{@const person = opened.person}
	<Modal title={m.person_remove_title({ name: person.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.person_remove_trips()}</p>
		{#if accountOf(person)}
			<p class="text-sm" data-testid="removal-order">{m.person_remove_order()}</p>
		{/if}
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => act(() => deletePerson(household.id, person.id))}
		>
			{m.person_remove()}
		</Button>
	</Modal>
{:else if opened?.kind === 'removeMember'}
	{@const member = opened.member}
	{@const name = opened.name}
	<Modal title={m.member_remove_title({ name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.member_remove_explains({ name })}</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => act(() => removeMember(household.id, member.id))}
		>
			{m.member_remove()}
		</Button>
	</Modal>
{:else if opened?.kind === 'leave'}
	<Modal title={m.household_leave_title({ name: household.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.household_leave_explains()}</p>
		<Button
			variant="destructive"
			disabled={submission.busy || !membership}
			onclick={() => membership && away(() => removeMember(household.id, membership.id))}
		>
			{m.household_leave()}
		</Button>
	</Modal>
{:else if opened?.kind === 'dissolve'}
	<Modal title={m.household_delete_title({ name: household.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.household_delete_explains()}</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => away(() => deleteHousehold(household.id))}
		>
			{m.household_delete()}
		</Button>
	</Modal>
{/if}
