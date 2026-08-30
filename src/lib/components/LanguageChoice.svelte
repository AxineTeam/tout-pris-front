<script lang="ts">
	import type { ApiLocale } from '$lib/api.js';
	import { fieldClass } from '$lib/components/AccountScreen.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { session } from '$lib/session.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';
	import { cn } from '$lib/utils.js';

	// Chaque langue s'écrit dans la sienne : c'est ainsi qu'on la reconnaît
	// quand on ne comprend pas celle qui est affichée.
	const names: Record<ApiLocale, string> = {
		fr: 'Français',
		'en-us': 'English'
	};
	const languages = Object.entries(names) as [ApiLocale, string][];

	const submission = new Submission();
	// allauth sert la langue du compte en simple chaîne : le nom affiché se
	// cherche dans la table plutôt que de l'y indexer.
	let spoken = $derived(session.user?.language ?? '');
	let name = $derived(languages.find(([code]) => code === spoken)?.[1] ?? '');

	function choose(value: string) {
		const chosen = languages.find(([code]) => code === value);
		if (!chosen || chosen[0] === spoken || submission.busy) return;
		submission.run(async () => {
			await session.changeLanguage(chosen[0]);
			return [];
		});
	}
</script>

<div class="grid gap-3">
	<FormErrors errors={submission.errors} />

	<div class="grid gap-2">
		<Label id="language-label" for="language-choice" class="text-muted-foreground text-xs">
			{m.me_language_choice()}
		</Label>

		<Select.Root type="single" disabled={submission.busy} bind:value={() => spoken, choose}>
			<Select.Trigger
				id="language-choice"
				aria-labelledby="language-label language-choice"
				class={cn(fieldClass, 'w-full px-3 data-[size=default]:h-[46px]')}
			>
				{name}
			</Select.Trigger>
			<Select.Content class="p-1">
				{#each languages as [code, written] (code)}
					<Select.Item value={code} label={written} class="h-11 pl-3" />
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
</div>
