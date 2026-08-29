<script lang="ts">
	import { fieldErrors, formErrors, type AuthError } from '$lib/api.js';
	import { fieldClass } from '$lib/components/AccountScreen.svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FieldErrors from '$lib/components/FieldErrors.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		submitLabel,
		onsubmit
	}: {
		submitLabel: string;
		onsubmit: (email: string) => Promise<AuthError[]>;
	} = $props();

	const submission = new Submission();
	let email = $state('');
	let canSubmit = $derived(email.trim().length > 0 && !submission.busy);
	let emailErrors = $derived(fieldErrors(submission.errors, 'email'));
	let otherErrors = $derived(formErrors(submission.errors, 'email'));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canSubmit) submission.run(() => onsubmit(email.trim()));
	}
</script>

<form class="grid gap-[14px]" onsubmit={submit} novalidate>
	<div class="grid gap-[7px]">
		<Label for="email" class="text-muted-foreground text-xs">{m.email_label()}</Label>
		<Input
			id="email"
			name="email"
			type="email"
			inputmode="email"
			autocomplete="email"
			autocapitalize="none"
			spellcheck={false}
			aria-invalid={emailErrors.length > 0}
			aria-describedby={emailErrors.length > 0 ? 'email-errors' : undefined}
			class={fieldClass}
			bind:value={email}
		/>
		<FieldErrors id="email-errors" errors={emailErrors} />
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
