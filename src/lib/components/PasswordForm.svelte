<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
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

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canSubmit) submission.run(() => onsubmit(password));
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<FormErrors errors={submission.errors} />

	<div class="grid gap-2">
		<Label for="password">{m.password_new_label()}</Label>
		<PasswordInput
			id="password"
			name="password"
			autocomplete="new-password"
			describes={m.password_new_it()}
			bind:value={password}
		/>
	</div>

	<Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
</form>
