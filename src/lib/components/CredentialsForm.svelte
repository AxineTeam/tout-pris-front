<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		submitLabel,
		passwordAutocomplete,
		onsubmit
	}: {
		submitLabel: string;
		passwordAutocomplete: 'current-password' | 'new-password';
		onsubmit: (email: string, password: string) => Promise<AuthError[]>;
	} = $props();

	const submission = new Submission();
	let email = $state('');
	let password = $state('');
	let canSubmit = $derived(email.trim().length > 0 && password.length > 0 && !submission.busy);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canSubmit) submission.run(() => onsubmit(email.trim(), password));
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<FormErrors errors={submission.errors} />

	<div class="grid gap-2">
		<Label for="email">{m.email_label()}</Label>
		<Input id="email" name="email" type="email" autocomplete="email" bind:value={email} />
	</div>

	<div class="grid gap-2">
		<Label for="password">{m.password_label()}</Label>
		<PasswordInput
			id="password"
			name="password"
			autocomplete={passwordAutocomplete}
			describes={m.password_it()}
			bind:value={password}
		/>
	</div>

	<Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
</form>
