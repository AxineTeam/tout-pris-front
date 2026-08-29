<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authErrors, changePassword } from '$lib/api.js';
	import DeployedVersion from '$lib/components/DeployedVersion.svelte';
	import EmailAddresses from '$lib/components/EmailAddresses.svelte';
	import PasswordChangeForm from '$lib/components/PasswordChangeForm.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { households } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';

	let landing = $derived(households.landing);

	async function change(current: string, renewed: string) {
		return authErrors(await changePassword(current, renewed));
	}

	async function disconnect() {
		await session.logOut();
		households.reset();
		await goto(resolve('/account/login'));
	}
</script>

<svelte:head><title>{m.title_me()}</title></svelte:head>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>{m.me_title()}</Card.Title>
			<Card.Description data-testid="account-display">{session.user?.display}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="min-w-0 text-sm wrap-anywhere" data-testid="account-email">
				{session.user?.email}
			</p>
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
			<div class="flex flex-wrap items-center gap-3">
				<Button variant="outline" size="sm" onclick={disconnect}>{m.log_out()}</Button>
				<ThemeToggle />
			</div>
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

	<DeployedVersion />
</div>
