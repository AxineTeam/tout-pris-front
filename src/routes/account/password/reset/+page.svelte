<script lang="ts">
	import { resolve } from '$app/paths';
	import { authErrors, requestPasswordReset } from '$lib/api.js';
	import EmailForm from '$lib/components/EmailForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let sent = $state(false);

	async function submit(email: string) {
		const errors = authErrors(await requestPasswordReset(email));
		sent = errors.length === 0;
		return errors;
	}
</script>

<svelte:head><title>{m.title_reset()}</title></svelte:head>

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>{m.reset_title()}</Card.Title>
		<Card.Description>{m.reset_intro()}</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if sent}
			<p data-testid="reset-requested">{m.reset_sent()}</p>
		{:else}
			<EmailForm submitLabel={m.reset_submit()} onsubmit={submit} />
		{/if}
	</Card.Content>
	<Card.Footer>
		<a class="text-primary text-sm underline" href={resolve('/account/login')}>{m.reset_back()}</a>
	</Card.Footer>
</Card.Root>
