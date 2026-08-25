<script lang="ts">
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from '$lib/components/ui/button/index.js';
	import { theme, type ThemeChoice } from '$lib/theme.svelte.js';

	const labels: Record<ThemeChoice, string> = {
		system: 'système',
		light: 'clair',
		dark: 'sombre'
	};
	const icons = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };
	const nextChoice: Record<ThemeChoice, ThemeChoice> = {
		system: 'light',
		light: 'dark',
		dark: 'system'
	};

	let next = $derived(nextChoice[theme.choice]);
	let Icon = $derived(icons[theme.choice]);

	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.dark);
	});
</script>

<Button
	variant="ghost"
	size="icon"
	aria-label={`Thème ${labels[theme.choice]}. Passer au thème ${labels[next]}`}
	onclick={() => theme.choose(next)}
>
	<Icon size={16} aria-hidden="true" />
</Button>
