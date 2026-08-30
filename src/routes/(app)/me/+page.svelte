<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authErrors, changePassword } from '$lib/api.js';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import DeployedVersion from '$lib/components/DeployedVersion.svelte';
	import EmailAddresses from '$lib/components/EmailAddresses.svelte';
	import LanguageChoice from '$lib/components/LanguageChoice.svelte';
	import PasswordChangeForm from '$lib/components/PasswordChangeForm.svelte';
	import ScreenHeader from '$lib/components/ScreenHeader.svelte';
	import TextLink from '$lib/components/TextLink.svelte';
	import ThemeChoice from '$lib/components/ThemeChoice.svelte';
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

{#snippet section(title: string, intro?: string)}
	<div class="grid gap-1.5">
		<h2 class="border-border border-b pb-2 text-base font-semibold">{title}</h2>
		{#if intro}
			<p class="text-muted-foreground text-xs">{intro}</p>
		{/if}
	</div>
{/snippet}

<ScreenHeader title={m.me_title()} />

<div class="grid gap-7">
	<div class="grid gap-1.5">
		<p class="text-base font-semibold" data-testid="account-display">{session.user?.display}</p>
		<p class="text-muted-foreground min-w-0 text-sm wrap-anywhere" data-testid="account-email">
			{session.user?.email}
		</p>
		<p class="text-muted-foreground text-sm">
			{m.me_name_intro()}
			{#if landing}
				<TextLink href={resolve('/(app)/households/[id]', { id: String(landing.id) })}>
					{m.me_name_link()}
				</TextLink>
			{:else}
				{m.me_name_link()}
			{/if}.
		</p>
	</div>

	<section class="grid gap-3">
		{@render section(m.me_language_title(), m.me_language_intro())}
		<LanguageChoice />
	</section>

	<section class="grid gap-3">
		{@render section(m.emails_title(), m.emails_intro())}
		<EmailAddresses />
	</section>

	<section class="grid gap-3">
		{@render section(m.password_title(), m.password_intro())}
		<PasswordChangeForm onsubmit={change} />
	</section>

	<section class="grid gap-3">
		{@render section(m.me_appearance_title())}
		<ThemeChoice />
	</section>

	<div class="grid gap-4">
		<ActionButton variant="outline" label={m.log_out()} onclick={disconnect} />
		<div class="text-center"><DeployedVersion /></div>
	</div>
</div>
