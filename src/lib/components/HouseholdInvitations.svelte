<script lang="ts">
	import { cancelInvitation, sendInvitation, type Invitation } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		invitations,
		canInvite,
		onchanged
	}: {
		household: number;
		invitations: Invitation[];
		canInvite: boolean;
		onchanged: () => void;
	} = $props();

	const submission = new Submission();
	let email = $state('');
	let sent = $state(false);

	let canSend = $derived(email.trim().length > 0 && !submission.busy);

	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

	function on(moment: string): string {
		return day.format(new Date(moment));
	}

	function invite(event: SubmitEvent) {
		event.preventDefault();
		if (!canSend) return;
		const invited = email.trim();
		submission.run(async () => {
			await sendInvitation(household, invited);
			email = '';
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
			{m.invitation_sent()}
		</p>
	{/if}

	<ul class="grid gap-2" data-testid="invitations">
		{#each invitations as invitation (invitation.id)}
			{@const expired = new Date(invitation.expires_at).getTime() <= Date.now()}
			<li class="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
				<span class="wrap-anywhere text-sm">{invitation.email}</span>
				{#if expired}
					<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
						{m.invitation_expired_badge()}
					</span>
				{:else}
					<span class="bg-pending text-pending-foreground rounded-full px-2 py-0.5 text-xs">
						{m.invitation_pending_badge()}
					</span>
				{/if}
				<span class="text-muted-foreground text-xs">
					{#if expired}
						{m.invitation_dates_expired({
							created: on(invitation.created_at),
							expires: on(invitation.expires_at)
						})}
					{:else}
						{m.invitation_dates_pending({
							created: on(invitation.created_at),
							expires: on(invitation.expires_at)
						})}
					{/if}
				</span>
				{#if canInvite}
					<Button
						variant="outline"
						size="sm"
						class="ml-auto"
						aria-label={m.invitation_cancel_label({ email: invitation.email })}
						onclick={() => cancel(invitation)}
						disabled={submission.busy}
					>
						{m.cancel()}
					</Button>
				{/if}
			</li>
		{/each}
	</ul>

	{#if invitations.length === 0}
		<p class="text-muted-foreground text-sm" data-testid="no-invitation">
			{m.invitation_none()}
		</p>
	{/if}

	{#if canInvite}
		<form class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onsubmit={invite}>
			<div class="grid gap-2">
				<Label for="invited-email">{m.invitation_email_label()}</Label>
				<Input id="invited-email" type="email" autocomplete="off" bind:value={email} />
			</div>
			<Button type="submit" disabled={!canSend}>{m.invite()}</Button>
		</form>
	{/if}
</div>
