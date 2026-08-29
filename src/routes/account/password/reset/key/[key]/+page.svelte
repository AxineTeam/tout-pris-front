<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { authErrors, readPasswordReset, resetPassword, type AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import PasswordForm from '$lib/components/PasswordForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
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

<Card.Root class="mx-auto max-w-md">
	<Card.Header>
		<Card.Title>{m.reset_key_title()}</Card.Title>
	</Card.Header>
	<Card.Content class="grid gap-4">
		{#if done}
			<p data-testid="reset-done">
				{m.password_changed()}
				<a class="text-primary underline" href={resolve('/account/login')}>{m.log_in()}</a>
			</p>
		{:else if keyErrors.length > 0}
			<FormErrors errors={keyErrors} title={m.link_unusable()} />
			<p class="text-muted-foreground text-sm">
				{m.reset_key_dead()}
				<a class="text-primary underline" href={resolve('/account/password/reset')}
					>{m.reset_key_ask_again()}</a
				>.
			</p>
		{:else if checked}
			<PasswordForm submitLabel={m.password_change_submit()} onsubmit={submit} />
		{:else}
			<p class="text-muted-foreground">{m.link_checking()}</p>
		{/if}
	</Card.Content>
</Card.Root>
