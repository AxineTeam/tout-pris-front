<script lang="ts">
	import { resolve } from '$app/paths';
	import CredentialsForm from '$lib/components/CredentialsForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
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

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>{m.signup_title()}</Card.Title>
		<Card.Description>{m.signup_intro()}</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if pending}
			<p data-testid="verification-pending">{m.signup_pending()}</p>
		{:else}
			<CredentialsForm
				submitLabel={m.signup_submit()}
				passwordAutocomplete="new-password"
				onsubmit={submit}
			/>
		{/if}
	</Card.Content>
	<Card.Footer>
		<p class="text-muted-foreground text-sm">
			{m.signup_have_account()}
			<a class="text-primary underline" href={resolve('/account/login')}>{m.log_in()}</a>
		</p>
	</Card.Footer>
</Card.Root>
