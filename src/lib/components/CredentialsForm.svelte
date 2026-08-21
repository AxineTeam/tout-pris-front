<script lang="ts">
	import type { AuthError } from '$lib/api.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let {
		submitLabel,
		passwordAutocomplete,
		onsubmit
	}: {
		submitLabel: string;
		passwordAutocomplete: 'current-password' | 'new-password';
		onsubmit: (email: string, password: string) => Promise<AuthError[]>;
	} = $props();

	let email = $state('');
	let password = $state('');
	let errors = $state.raw<AuthError[]>([]);
	let busy = $state(false);
	let canSubmit = $derived(email.trim().length > 0 && password.length > 0 && !busy);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		busy = true;
		try {
			errors = await onsubmit(email.trim(), password);
		} catch {
			errors = [{ message: 'Le backend est injoignable.', code: 'unreachable' }];
		} finally {
			busy = false;
		}
	}
</script>

<form class="grid gap-4" onsubmit={submit}>
	{#if errors.length > 0}
		<Alert.Root variant="destructive">
			<Alert.Title>Échec</Alert.Title>
			<Alert.Description>
				<ul>
					{#each errors as error (`${error.param ?? ''}:${error.code}:${error.message}`)}
						<li>{error.message}</li>
					{/each}
				</ul>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid gap-2">
		<Label for="email">Adresse email</Label>
		<Input id="email" name="email" type="email" autocomplete="email" bind:value={email} />
	</div>

	<div class="grid gap-2">
		<Label for="password">Mot de passe</Label>
		<Input
			id="password"
			name="password"
			type="password"
			autocomplete={passwordAutocomplete}
			bind:value={password}
		/>
	</div>

	<Button type="submit" disabled={!canSubmit}>{submitLabel}</Button>
</form>
