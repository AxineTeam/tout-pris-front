<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';
	import { authErrors, readEmailVerification, type AuthError } from '$lib/api.js';
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import TextLink from '$lib/components/TextLink.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { params }: PageProps = $props();
	const key = $derived(params.key);
	const submission = new Submission();
	let address = $state<string | null>(null);
	let keyErrors = $state.raw<AuthError[]>([]);
	let confirmed = $state(false);

	async function readKey() {
		try {
			const response = await readEmailVerification(key);
			address = response.data?.user?.email ?? null;
			keyErrors = authErrors(response);
		} catch {
			keyErrors = [{ message: m.api_unreachable(), code: 'unreachable' }];
		}
	}

	function confirm() {
		submission.run(async () => {
			const errors = authErrors(await session.verifyEmail(key));
			confirmed = errors.length === 0;
			return errors;
		});
	}

	readKey();
</script>

<svelte:head><title>{m.title_verify()}</title></svelte:head>

<AccountScreen title={m.verify_title()}>
	{#if confirmed}
		{#if session.authenticated}
			<p class="text-sm" data-testid="verified-signed-in">
				{m.verify_done_signed_in()}
				<TextLink href={resolve('/')}>{m.go_home()}</TextLink>
			</p>
		{:else}
			<p class="text-sm" data-testid="verified-signed-out">
				{m.verify_done()}
				<TextLink href={resolve('/account/login')}>{m.log_in()}</TextLink>
			</p>
		{/if}
	{:else if keyErrors.length > 0}
		<FormErrors errors={keyErrors} title={m.link_unusable()} />
		<p class="text-muted-foreground text-sm">
			{m.verify_dead_before()}
			<TextLink href={resolve('/account/signup')}>
				{m.verify_dead_signup()}
			</TextLink>{m.verify_dead_between()}
			<TextLink href={resolve('/account/login')}>
				{m.verify_dead_login()}
			</TextLink>
			{m.verify_dead_after()}
		</p>
	{:else}
		<FormErrors errors={submission.errors} />
		<p class="text-sm wrap-anywhere">
			{address ? m.verify_confirm({ email: address }) : m.link_checking()}
		</p>
		<ActionButton
			label={m.verify_submit()}
			busy={submission.busy}
			disabled={!address || submission.busy}
			onclick={confirm}
		/>
	{/if}
</AccountScreen>
