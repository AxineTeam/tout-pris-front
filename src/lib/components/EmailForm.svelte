<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canSubmit) submission.run(() => onsubmit(email.trim()));
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<FormErrors errors={submission.errors} />

	<div class="grid gap-2">
		<Label for="email">Adresse email</Label>
		<Input id="email" name="email" type="email" autocomplete="email" bind:value={email} />
	</div>

	<Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
</form>
