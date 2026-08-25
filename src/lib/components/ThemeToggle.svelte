<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import SunMoonIcon from '@lucide/svelte/icons/sun-moon';
	import { Button } from '$lib/components/ui/button/index.js';
	import { theme, type ThemeChoice } from '$lib/theme.svelte.js';

	const labels: Record<ThemeChoice, string> = {
		system: 'système',
		light: 'clair',
		dark: 'sombre'
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
	aria-label={`Thème ${labels[theme.choice]}. Passer au thème ${labels[next]}`}
	onclick={() => theme.choose(next)}
>
	<Icon size={16} aria-hidden="true" />
</Button>
