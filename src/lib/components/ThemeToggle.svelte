<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import SunMoonIcon from '@lucide/svelte/icons/sun-moon';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { theme, type ThemeChoice } from '$lib/theme.svelte.js';

	const labels: Record<ThemeChoice, () => string> = {
		system: m.theme_system,
		light: m.theme_light,
		dark: m.theme_dark
	};
	const icons = { system: SunMoonIcon, light: SunIcon, dark: MoonIcon };
	const nextChoice: Record<ThemeChoice, ThemeChoice> = {
		system: 'light',
		light: 'dark',
		dark: 'system'
	};

	let next = $derived(nextChoice[theme.choice]);
	let Icon = $derived(icons[theme.choice]);
</script>

<Button
	variant="ghost"
	size="icon"
	aria-label={m.theme_toggle({ current: labels[theme.choice](), next: labels[next]() })}
	onclick={() => theme.choose(next)}
>
	<Icon size={16} aria-hidden="true" />
</Button>
