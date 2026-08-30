<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import TextLink from '$lib/components/TextLink.svelte';
	import { authErrors } from '$lib/api.js';
	import { returnTo } from '$lib/navigation.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';

	async function submit(email: string, password: string) {
		const response = await session.logIn(email, password);
		if (session.authenticated) await returnTo(page.url.searchParams.get('next'), resolve('/'));
		return authErrors(response);
	}
</script>

<svelte:head><title>{m.title_login()}</title></svelte:head>

<AccountScreen title={m.login_title()}>
	<CredentialsForm
		submitLabel={m.log_in()}
		passwordAutocomplete="current-password"
		onsubmit={submit}
	/>
	<p class="text-center">
		<TextLink class="p-2 text-sm" href={resolve('/account/password/reset')}>
			{m.password_forgotten_link()}
		</TextLink>
	</p>

	{#snippet footer()}
		{m.login_no_account()}
		<TextLink href={resolve('/account/signup')}>{m.signup_link()}</TextLink>
	{/snippet}
</AccountScreen>
