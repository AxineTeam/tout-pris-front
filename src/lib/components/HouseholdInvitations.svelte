<script lang="ts">
	import { cancelInvitation, sendInvitation, type Invitation, type Person } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		invitations,
		persons,
		canInvite,
		onchanged
	}: {
		household: number;
		invitations: Invitation[];
		persons: Person[];
		canInvite: boolean;
		onchanged: () => void;
	} = $props();

	const submission = new Submission();
	let email = $state('');
	let designated = $state('');
	let sent = $state(false);

	let unclaimed = $derived(persons.filter((person) => person.user === null));
	let named = $derived(new Map(persons.map((person) => [person.id, person.name])));
	let canSend = $derived(email.trim().length > 0 && !submission.busy);

	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

	function on(moment: string): string {
		return day.format(new Date(moment));
	}

	function invite(event: SubmitEvent) {
		event.preventDefault();
		if (!canSend) return;
		const invited = email.trim();
		const person = designated === '' ? null : Number(designated);
		submission.run(async () => {
			await sendInvitation(household, invited, person);
			email = '';
			designated = '';
			sent = true;
			onchanged();
			return [];
		});
	}

	function cancel(invitation: Invitation) {
		submission.run(async () => {
			await cancelInvitation(household, invitation.id);
			onchanged();
			return [];
		});
	}
</script>

<div class="grid gap-4">
	<FormErrors errors={submission.errors} />

	{#if sent}
		<p class="rounded-md border border-dashed px-3 py-2 text-sm" data-testid="invitation-sent">
			Si cette adresse peut être invitée, elle recevra un lien. Le foyer ne dit pas qui a déjà un
			compte : l’invitation apparaîtra ci-dessous si elle a été créée.
		</p>
	{/if}

	<ul class="grid gap-2" data-testid="invitations">
		{#each invitations as invitation (invitation.id)}
			<li class="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
				<span class="text-sm">{invitation.email}</span>
				<span class="text-muted-foreground text-xs">
					envoyée le {on(invitation.created_at)}, expire le {on(invitation.expires_at)}
					{#if invitation.person !== null && named.has(invitation.person)}
						— pour {named.get(invitation.person)}
					{/if}
				</span>
				{#if canInvite}
					<Button
						variant="outline"
						size="sm"
						class="ml-auto"
						onclick={() => cancel(invitation)}
						disabled={submission.busy}
					>
						Annuler l’invitation de {invitation.email}
					</Button>
				{/if}
			</li>
		{/each}
	</ul>

	{#if invitations.length === 0}
		<p class="text-muted-foreground text-sm" data-testid="no-invitation">
			Aucune invitation en attente.
		</p>
	{/if}

	{#if canInvite}
		<form class="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end" onsubmit={invite}>
			<div class="grid gap-2">
				<Label for="invited-email">Inviter une adresse</Label>
				<Input id="invited-email" type="email" autocomplete="off" bind:value={email} />
			</div>
			<div class="grid gap-2">
				<Label for="invited-person">Personne qu’elle est déjà ici</Label>
				<select
					id="invited-person"
					bind:value={designated}
					class="border-input bg-background h-9 rounded-md border px-3 py-1 text-sm"
				>
					<option value="">Personne à créer</option>
					{#each unclaimed as person (person.id)}
						<option value={String(person.id)}>{person.name}</option>
					{/each}
				</select>
			</div>
			<Button type="submit" disabled={!canSend}>Inviter</Button>
		</form>
	{/if}
</div>
