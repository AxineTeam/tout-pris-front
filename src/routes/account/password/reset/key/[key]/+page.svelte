<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { authErrors, readPasswordReset, resetPassword, type AuthError } from '$lib/api.js';
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import PasswordForm from '$lib/components/PasswordForm.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { params }: PageProps = $props();
	const key = $derived(params.key);
	let keyErrors = $state.raw<AuthError[]>([]);
	let checked = $state(false);
	let done = $state(false);

	async function readKey() {
		try {
			keyErrors = authErrors(await readPasswordReset(key));
		} catch {
			keyErrors = [{ message: m.api_unreachable(), code: 'unreachable' }];
		} finally {
			checked = true;
		}
	}

	async function submit(password: string) {
		const errors = authErrors(await resetPassword(key, password));
		done = errors.length === 0;
		return errors;
	}

	readKey();
</script>

<svelte:head><title>{m.title_reset_key()}</title></svelte:head>

<AccountScreen title={m.reset_key_title()}>
	{#if done}
		<p class="text-sm" data-testid="reset-done">
			{m.password_changed()}
			<a class="text-primary font-semibold" href={resolve('/account/login')}>{m.log_in()}</a>
		</p>
	{:else if keyErrors.length > 0}
		<FormErrors errors={keyErrors} title={m.link_unusable()} />
		<p class="text-muted-foreground text-sm">
			{m.reset_key_dead()}
			<a class="text-primary font-semibold" href={resolve('/account/password/reset')}>
				{m.reset_key_ask_again()}
			</a>.
		</p>
	{:else if checked}
		<PasswordForm submitLabel={m.password_change_submit()} onsubmit={submit} />
	{:else}
		<p class="text-muted-foreground text-sm">{m.link_checking()}</p>
	{/if}
</AccountScreen>
