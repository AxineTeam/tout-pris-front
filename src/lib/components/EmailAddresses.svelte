<script lang="ts">
	import {
		addEmail,
		authErrors,
		listEmails,
		makeEmailPrimary,
		removeEmail,
		resendEmailVerification,
		type AuthError,
		type AuthResponse,
		type EmailAddress
	} from '$lib/api.js';
	import { fieldClass } from '$lib/components/AccountScreen.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	const rowActionClass = 'h-11 rounded-[10px] px-3 text-[13px]';

	const submission = new Submission();
	let addresses = $state.raw<EmailAddress[]>([]);
	let added = $state('');
	let acting = $state('');
	let canAdd = $derived(added.trim().length > 0 && !submission.busy);

	function apply(response: AuthResponse<EmailAddress[]>): AuthError[] {
		if (response.data) addresses = response.data;
		return authErrors(response);
	}

	function load() {
		submission.run(async () => apply(await listEmails()));
	}

	function act(email: string, call: () => Promise<AuthResponse<EmailAddress[]>>) {
		acting = email;
		submission.run(async () => apply(await call()));
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!canAdd) return;
		const email = added.trim();
		acting = '';
		submission.run(async () => {
			const errors = apply(await addEmail(email));
			if (errors.length === 0) added = '';
			return errors;
		});
	}

	load();
</script>

<div class="grid gap-4">
	<FormErrors errors={submission.errors} />

	<ul class="grid gap-2" data-testid="email-addresses">
		{#each addresses as address (address.email)}
			<li
				class="bg-card border-border flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
			>
				<span class="text-sm">{address.email}</span>
				{#if address.primary}
					<span class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
						{m.email_primary()}
					</span>
				{:else}
					<span class="text-muted-foreground text-xs">
						{address.verified ? m.email_verified() : m.email_unverified()}
					</span>
				{/if}
				<span class="ml-auto flex gap-2">
					{#if !address.verified}
						<Button
							variant="outline"
							class={rowActionClass}
							disabled={submission.busy}
							onclick={() => act(address.email, () => resendEmailVerification(address.email))}
						>
							{m.email_resend_verification()}
						</Button>
					{/if}
					{#if !address.primary && address.verified}
						<Button
							variant="outline"
							class={rowActionClass}
							disabled={submission.busy}
							onclick={() => act(address.email, () => makeEmailPrimary(address.email))}
						>
							{m.email_make_primary()}
						</Button>
					{/if}
					{#if !address.primary}
						<Button
							variant="outline"
							class={rowActionClass}
							disabled={submission.busy}
							onclick={() => act(address.email, () => removeEmail(address.email))}
						>
							{m.delete()}
						</Button>
					{/if}
				</span>
			</li>
		{/each}
	</ul>

	<form class="grid gap-2" onsubmit={add}>
		<Label for="new-email" class="text-muted-foreground text-xs">{m.email_add_label()}</Label>
		<Input
			id="new-email"
			type="email"
			inputmode="email"
			autocomplete="email"
			autocapitalize="none"
			spellcheck={false}
			class={fieldClass}
			bind:value={added}
		/>
		<ActionButton
			type="submit"
			label={m.add()}
			busy={submission.busy && acting === ''}
			disabled={!canAdd}
		/>
	</form>
</div>
