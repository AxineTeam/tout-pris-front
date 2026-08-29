<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
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

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>{m.login_title()}</Card.Title>
		<Card.Description>{m.login_intro()}</Card.Description>
	</Card.Header>
	<Card.Content>
		<CredentialsForm
			submitLabel={m.log_in()}
			passwordAutocomplete="current-password"
			onsubmit={submit}
		/>
	</Card.Content>
	<Card.Footer>
		<p class="text-muted-foreground text-sm">
			{m.login_no_account()}
			<a class="text-primary underline" href={resolve('/account/signup')}>{m.signup_link()}</a>
			—
			<a class="text-primary underline" href={resolve('/account/password/reset')}
				>{m.password_forgotten_link()}</a
			>
		</p>
	</Card.Footer>
</Card.Root>
