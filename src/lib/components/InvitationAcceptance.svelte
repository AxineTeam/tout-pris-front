<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		ApiError,
		acceptInvitation,
		apiErrors,
		readInvitation,
		type AuthError,
		type InvitationPreview
	} from '$lib/api.js';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { households } from '$lib/households.svelte.js';
	import { locale } from '$lib/locale.svelte.js';
	import { goToLogin, loginPath } from '$lib/navigation.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { token }: { token: string } = $props();

	const submission = new Submission();
	let invitation = $state.raw<InvitationPreview | null>(null);
	let readErrors = $state.raw<AuthError[]>([]);
	let dead = $state(false);
	let checked = $state(false);

	let here = $derived(resolve('/invitations/[key]', { key: token }));
	let login = $derived(loginPath(here));

	async function read() {
		try {
			invitation = await readInvitation(token);
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 404) dead = true;
			else if (cause instanceof ApiError) readErrors = apiErrors(cause);
			else readErrors = [{ message: m.api_unreachable(), code: 'unreachable' }];
		} finally {
			checked = true;
		}
	}

	function accept() {
		submission.run(async () => {
			let joined;
			try {
				joined = await acceptInvitation(token);
			} catch (cause) {
				if (!(cause instanceof ApiError) || cause.status !== 404) throw cause;
				dead = true;
				return [];
			}
			households.reset();
			await goto(resolve('/(app)/households/[id]', { id: String(joined.id) }));
			return [];
		});
	}

	async function change() {
		await session.logOut();
		households.reset();
		await goToLogin(here);
	}

	read();
</script>

<FormErrors errors={[...readErrors, ...submission.errors]} />

{#snippet actions()}
	{#if session.authenticated}
		<div class="grid gap-2">
			<ActionButton
				label={m.invitation_accept()}
				busy={submission.busy}
				disabled={submission.busy}
				onclick={accept}
			/>
			<ActionButton
				variant="outline"
				label={m.invitation_other_account()}
				disabled={submission.busy}
				onclick={change}
			/>
		</div>
	{:else}
		<div class="grid gap-2">
			<ActionButton label={m.log_in()} href={login} />
			<ActionButton variant="outline" label={m.signup_link()} href={resolve('/account/signup')} />
		</div>
	{/if}
{/snippet}

{#if dead}
	<div class="border-border bg-card grid gap-1 rounded-xl border p-4">
		<p class="text-destructive text-sm font-medium">{m.invitation_unusable()}</p>
		<p class="text-muted-foreground text-sm" data-testid="invitation-dead">{m.invitation_dead()}</p>
	</div>
{:else if !checked}
	<p class="text-muted-foreground text-sm">{m.link_checking()}</p>
{:else if invitation}
	<div class="border-border bg-card grid gap-1 rounded-xl border p-4">
		<p class="text-base wrap-anywhere" data-testid="invitation-household">
			{invitation.inviter
				? m.invitation_from({ inviter: invitation.inviter, household: invitation.household })
				: m.invitation_from_unknown({ household: invitation.household })}
		</p>
		<p class="text-muted-foreground text-xs">
			{m.invitation_expires({ date: locale.day(invitation.expires_at) })}
		</p>
	</div>

	{#if session.authenticated}
		<p class="text-sm wrap-anywhere" data-testid="invitation-account">
			{m.invitation_account({ email: session.user?.email ?? '' })}
		</p>
	{/if}
	{@render actions()}
{:else}
	{@render actions()}
{/if}
