<script lang="ts">
	import { fieldErrors, formErrors, type AuthError } from '$lib/api.js';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		submitLabel,
		onsubmit
	}: {
		submitLabel: string;
		onsubmit: (password: string) => Promise<AuthError[]>;
	} = $props();

	const submission = new Submission();
	let password = $state('');
	let canSubmit = $derived(password.length > 0 && !submission.busy);
	let passwordErrors = $derived(fieldErrors(submission.errors, 'password'));
	let otherErrors = $derived(formErrors(submission.errors, 'password'));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canSubmit) submission.run(() => onsubmit(password));
	}
</script>

<form class="grid gap-[14px]" onsubmit={submit} novalidate>
	<div class="grid gap-[7px]">
		<Label for="password" class="text-muted-foreground text-xs">{m.password_new_label()}</Label>
		<PasswordInput
			id="password"
			name="password"
			autocomplete="new-password"
			describes={m.password_new_it()}
			errors={passwordErrors}
			bind:value={password}
		/>
	</div>

	<FormErrors errors={otherErrors} />

	<ActionButton
		type="submit"
		label={submitLabel}
		busy={submission.busy}
		disabled={!canSubmit}
		class="mt-[2px]"
	/>
</form>
