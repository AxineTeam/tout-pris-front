<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import PasswordInput from '$lib/components/PasswordInput.svelte';
	import * as m from '$lib/paraglide/messages.js';
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
		<p data-testid="password-changed">{m.password_changed()}</p>
	{/if}

	<div class="grid gap-2">
		<Label for="current-password" class="text-muted-foreground text-xs">
			{m.password_current_label()}
		</Label>
		<PasswordInput
			id="current-password"
			autocomplete="current-password"
			describes={m.password_current_it()}
			bind:value={current}
		/>
	</div>

	<div class="grid gap-2">
		<Label for="new-password" class="text-muted-foreground text-xs">
			{m.password_new_label()}
		</Label>
		<PasswordInput
			id="new-password"
			autocomplete="new-password"
			describes={m.password_new_it()}
			bind:value={renewed}
		/>
	</div>

	<ActionButton
		type="submit"
		label={m.password_change_submit()}
		busy={submission.busy}
		disabled={!canSubmit}
	/>
</form>
