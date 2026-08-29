<script lang="ts">
	import { resolve } from '$app/paths';
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import { authErrors } from '$lib/api.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session, verificationPending } from '$lib/session.svelte.js';

	let pending = $state(false);

	async function submit(email: string, password: string) {
		const response = await session.signUp(email, password);
		const errors = authErrors(response);
		pending = errors.length === 0 && verificationPending(response);
		return errors;
	}
</script>

<svelte:head><title>{m.title_signup()}</title></svelte:head>

<AccountScreen title={m.signup_title()} intro={m.signup_intro()}>
	{#if pending}
		<p class="text-sm" data-testid="verification-pending">{m.signup_pending()}</p>
	{:else}
		<CredentialsForm
			submitLabel={m.signup_submit()}
			passwordAutocomplete="new-password"
			onsubmit={submit}
		/>
	{/if}

	{#snippet footer()}
		{m.signup_have_account()}
		<a class="text-primary font-semibold" href={resolve('/account/login')}>{m.log_in()}</a>
	{/snippet}
</AccountScreen>
