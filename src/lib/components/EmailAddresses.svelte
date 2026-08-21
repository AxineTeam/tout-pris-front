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
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Submission } from '$lib/submission.svelte.js';

	const submission = new Submission();
	let addresses = $state.raw<EmailAddress[]>([]);
	let added = $state('');
	let canAdd = $derived(added.trim().length > 0 && !submission.busy);

	function apply(response: AuthResponse<EmailAddress[]>): AuthError[] {
		if (response.data) addresses = response.data;
		return authErrors(response);
	}

	function act(call: () => Promise<AuthResponse<EmailAddress[]>>) {
		submission.run(async () => apply(await call()));
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!canAdd) return;
		const email = added.trim();
		submission.run(async () => {
			const errors = apply(await addEmail(email));
			if (errors.length === 0) added = '';
			return errors;
		});
	}

	act(listEmails);
</script>

<div class="grid gap-4">
	<FormErrors errors={submission.errors} />

	<ul class="grid gap-2" data-testid="email-addresses">
		{#each addresses as address (address.email)}
			<li class="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
				<span class="text-sm">{address.email}</span>
				<span class="text-muted-foreground text-xs">
					{address.primary ? 'principale' : address.verified ? 'vérifiée' : 'non vérifiée'}
				</span>
				<span class="ml-auto flex gap-2">
					{#if !address.verified}
						<Button
							variant="outline"
							size="sm"
							onclick={() => act(() => resendEmailVerification(address.email))}
						>
							Renvoyer la vérification
						</Button>
					{/if}
					{#if !address.primary}
						<Button
							variant="outline"
							size="sm"
							onclick={() => act(() => makeEmailPrimary(address.email))}
						>
							Rendre principale
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => act(() => removeEmail(address.email))}
						>
							Supprimer
						</Button>
					{/if}
				</span>
			</li>
		{/each}
	</ul>

	<form class="flex items-end gap-3" onsubmit={add}>
		<div class="grid flex-1 gap-2">
			<Label for="new-email">Ajouter une adresse</Label>
			<Input id="new-email" type="email" autocomplete="email" bind:value={added} />
		</div>
		<Button type="submit" disabled={!canAdd}>Ajouter</Button>
	</form>
</div>
