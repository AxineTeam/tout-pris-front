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
		<Label for="password">Nouveau mot de passe</Label>
		<Input
			id="password"
			name="password"
			type="password"
			autocomplete="new-password"
			bind:value={password}
		/>
	</div>

	<Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
</form>
