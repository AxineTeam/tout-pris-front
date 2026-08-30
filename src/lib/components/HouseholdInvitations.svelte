<script lang="ts">
	import MailIcon from '@lucide/svelte/icons/mail';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { cancelInvitation, sendInvitation, type Invitation } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { locale } from '$lib/locale.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		invitations,
		onchanged
	}: {
		household: number;
		invitations: Invitation[];
		onchanged: () => void;
	} = $props();

	const sending = new Submission();
	const cancelling = new Submission();
	let inviting = $state(false);
	let email = $state('');
	let sent = $state(false);

	function invite(event: SubmitEvent) {
		event.preventDefault();
		const invited = email.trim();
		if (!invited) return;
		sending.run(async () => {
			await sendInvitation(household, invited);
			email = '';
			sent = true;
			inviting = false;
			onchanged();
			return [];
		});
	}

	function cancel(invitation: Invitation) {
		cancelling.run(async () => {
			await cancelInvitation(household, invitation.id);
			onchanged();
			return [];
		});
	}
</script>

<section class="grid gap-3">
	<h2 class="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
		{m.invitations_title()}
	</h2>

	<FormErrors errors={cancelling.errors} />

	{#if sent}
		<p
			class="bg-pending text-pending-foreground rounded-xl px-3 py-2 text-sm"
			data-testid="invitation-sent"
		>
			{m.invitation_sent()}
		</p>
	{/if}

	<ul class="grid min-w-0 gap-2" data-testid="invitations">
		{#each invitations as invitation (invitation.id)}
			{@const expired = new Date(invitation.expires_at).getTime() <= Date.now()}
			<li
				class="bg-pending text-pending-foreground flex min-w-0 items-start gap-3 rounded-xl px-3 py-2.5"
			>
				<MailIcon size={18} aria-hidden="true" class="mt-0.5 flex-none" />
				<span class="min-w-0 flex-1">
					<span class="block text-sm font-semibold wrap-anywhere">{invitation.email}</span>
					<span class="block text-xs wrap-anywhere">
						{#if expired}
							{m.invitation_dates_expired({
								created: locale.day(invitation.created_at),
								expires: locale.day(invitation.expires_at)
							})}
						{:else}
							{m.invitation_dates_pending({
								created: locale.day(invitation.created_at),
								expires: locale.day(invitation.expires_at)
							})}
						{/if}
					</span>
				</span>
				<button
					type="button"
					aria-label={m.invitation_cancel_label({ email: invitation.email })}
					disabled={cancelling.busy}
					onclick={() => cancel(invitation)}
					class="-mt-2 -mr-2 -mb-2 flex size-11 flex-none items-center justify-center"
				>
					<XIcon size={18} aria-hidden="true" />
				</button>
			</li>
		{/each}
	</ul>

	{#if invitations.length === 0}
		<p class="text-muted-foreground text-sm" data-testid="no-invitation">{m.invitation_none()}</p>
	{/if}

	<button
		type="button"
		onclick={() => {
			sending.errors = [];
			inviting = true;
		}}
		class="border-border text-primary flex min-h-11 w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-semibold"
	>
		<PlusIcon size={18} aria-hidden="true" />
		{m.invitation_send()}
	</button>
</section>

{#if inviting}
	<Modal
		title={m.invitation_send()}
		description={m.invitations_intro()}
		onclose={() => (inviting = false)}
	>
		<FormErrors errors={sending.errors} />
		<form class="grid gap-4" onsubmit={invite}>
			<div class="grid gap-2">
				<Label for="invited-email">{m.invitation_email_label()}</Label>
				<Input id="invited-email" type="email" autocomplete="off" bind:value={email} />
			</div>
			<Button type="submit" disabled={sending.busy || email.trim().length === 0}>
				{m.invite()}
			</Button>
		</form>
	</Modal>
{/if}
