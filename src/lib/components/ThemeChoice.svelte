<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import SunMoonIcon from '@lucide/svelte/icons/sun-moon';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { theme, type ThemeChoice } from '$lib/theme.svelte.js';

	const choices: { choice: ThemeChoice; label: () => string; icon: LucideIcon }[] = [
		{ choice: 'system', label: m.theme_system, icon: SunMoonIcon },
		{ choice: 'light', label: m.theme_light, icon: SunIcon },
		{ choice: 'dark', label: m.theme_dark, icon: MoonIcon }
	];
</script>

<div class="grid grid-cols-3 gap-3" role="group" aria-label={m.me_theme_choice()}>
	{#each choices as { choice, label, icon } (choice)}
		<ActionButton
			label={label()}
			{icon}
			class="px-2 text-sm"
			variant={choice === theme.choice ? 'default' : 'outline'}
			aria-pressed={choice === theme.choice}
			onclick={() => theme.choose(choice)}
		/>
	{/each}
</div>
