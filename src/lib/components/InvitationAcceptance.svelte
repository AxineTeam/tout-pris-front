<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiError, acceptInvitation } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { households } from '$lib/households.svelte.js';
	import { goToLogin, loginPath } from '$lib/navigation.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { token }: { token: string } = $props();

	const submission = new Submission();
	let dead = $state(false);

	let here = $derived(resolve('/invitations/[key]', { key: token }));
	let login = $derived(loginPath(here));

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
</script>

<FormErrors errors={submission.errors} title={m.invitation_unusable()} />

{#if dead}
	<p class="text-sm" data-testid="invitation-dead">{m.invitation_dead()}</p>
{:else if session.authenticated}
	<p data-testid="invitation-account">
		{m.invitation_account_before()}
		<strong>{session.user?.email}</strong>{m.invitation_account_after()}
	</p>
	<div class="flex flex-wrap gap-2">
		<Button onclick={accept} disabled={submission.busy}>{m.invitation_accept()}</Button>
		<Button variant="outline" onclick={change} disabled={submission.busy}>
			{m.invitation_other_account()}
		</Button>
	</div>
{:else}
	<p data-testid="invitation-anonymous">{m.invitation_anonymous()}</p>
	<div class="flex flex-wrap gap-2">
		<Button href={login}>{m.log_in()}</Button>
		<Button variant="outline" href={resolve('/account/signup')}>{m.signup_link()}</Button>
	</div>
{/if}
