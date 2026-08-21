<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		onsubmit
	}: {
		onsubmit: (current: string, renewed: string) => Promise<AuthError[]>;
	} = $props();

	const submission = new Submission();
	let current = $state('');
	let renewed = $state('');
	let changed = $state(false);
	let canSubmit = $derived(current.length > 0 && renewed.length > 0 && !submission.busy);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		await submission.run(() => onsubmit(current, renewed));
		changed = submission.errors.length === 0;
		if (changed) {
			current = '';
			renewed = '';
		}
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	<FormErrors errors={submission.errors} />

	{#if changed}
		<p data-testid="password-changed">Mot de passe changé.</p>
	{/if}

	<div class="grid gap-2">
		<Label for="current-password">Mot de passe actuel</Label>
		<Input
			id="current-password"
			type="password"
			autocomplete="current-password"
			bind:value={current}
		/>
	</div>

	<div class="grid gap-2">
		<Label for="new-password">Nouveau mot de passe</Label>
		<Input id="new-password" type="password" autocomplete="new-password" bind:value={renewed} />
	</div>

	<Button type="submit" disabled={!canSubmit}>Changer mon mot de passe</Button>
</form>
