<script lang="ts">
	import { resolve } from '$app/paths';
	import { authErrors, requestPasswordReset } from '$lib/api.js';
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import EmailForm from '$lib/components/EmailForm.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let sent = $state(false);

	async function submit(email: string) {
		const errors = authErrors(await requestPasswordReset(email));
		sent = errors.length === 0;
		return errors;
	}
</script>

<svelte:head><title>{m.title_reset()}</title></svelte:head>

<AccountScreen title={m.reset_title()} intro={m.reset_intro()}>
	{#if sent}
		<p class="text-sm" data-testid="reset-requested">{m.reset_sent()}</p>
	{:else}
		<EmailForm submitLabel={m.reset_submit()} onsubmit={submit} />
	{/if}

	{#snippet footer()}
		<a class="text-primary font-semibold" href={resolve('/account/login')}>{m.reset_back()}</a>
	{/snippet}
</AccountScreen>
