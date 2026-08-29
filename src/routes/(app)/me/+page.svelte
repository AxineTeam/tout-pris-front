<script lang="ts">
	import { resolve } from '$app/paths';
	import { authErrors, changePassword } from '$lib/api.js';
	import EmailAddresses from '$lib/components/EmailAddresses.svelte';
	import PasswordChangeForm from '$lib/components/PasswordChangeForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { households } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';

	let landing = $derived(households.landing);

	async function change(current: string, renewed: string) {
		return authErrors(await changePassword(current, renewed));
	}
</script>

<svelte:head><title>{m.title_me()}</title></svelte:head>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.me_title()}</Card.Title>
			<Card.Description data-testid="account-display">{session.user?.display}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-muted-foreground text-sm">
				{m.me_name_intro()}
				{#if landing}
					<a
						class="text-primary underline"
						href={resolve('/(app)/households/[id]', { id: String(landing.id) })}
					>
						{m.me_name_link()}
					</a>
				{:else}
					{m.me_name_link()}
				{/if}.
			</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.emails_title()}</Card.Title>
			<Card.Description>{m.emails_intro()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<EmailAddresses />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{m.password_title()}</Card.Title>
			<Card.Description>{m.password_intro()}</Card.Description>
		</Card.Header>
		<Card.Content>
			<PasswordChangeForm onsubmit={change} />
		</Card.Content>
	</Card.Root>
</div>
