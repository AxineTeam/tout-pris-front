<script lang="ts">
	import type { ApiLocale } from '$lib/api.js';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	// Chaque langue s'écrit dans la sienne : c'est ainsi qu'on la reconnaît
	// quand on ne comprend pas celle qui est affichée.
	const languages: { code: ApiLocale; label: string }[] = [
		{ code: 'fr', label: 'Français' },
		{ code: 'en-us', label: 'English' }
	];

	const submission = new Submission();
	let asked = $state('');
	let spoken = $derived(session.user?.language);

	function choose(code: ApiLocale) {
		if (code === spoken || submission.busy) return;
		asked = code;
		submission.run(async () => {
			await session.changeLanguage(code);
			return [];
		});
	}
</script>

<div class="grid gap-3">
	<FormErrors errors={submission.errors} />

	<div class="grid grid-cols-2 gap-3" role="group" aria-label={m.me_language_choice()}>
		{#each languages as language (language.code)}
			<ActionButton
				label={language.label}
				variant={language.code === spoken ? 'default' : 'outline'}
				aria-pressed={language.code === spoken}
				busy={submission.busy && language.code === asked}
				disabled={submission.busy}
				onclick={() => choose(language.code)}
			/>
		{/each}
	</div>
</div>
