<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { onSessionExpired } from '$lib/api.js';
	import DeployedVersion from '$lib/components/DeployedVersion.svelte';
	import { households } from '$lib/households.svelte.js';
	import { locale } from '$lib/locale.svelte.js';
	import { session } from '$lib/session.svelte.js';
	import { theme } from '$lib/theme.svelte.js';

	let { children }: { children: Snippet } = $props();

	let inShell = $derived(page.route.id?.startsWith('/(app)') ?? false);

	onSessionExpired(() => {
		session.expire();
		households.reset();
	});

	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.dark);
	});

	$effect(() => {
		document.documentElement.lang = locale.current;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Tout Pris</title>
</svelte:head>

<div class="bg-background text-foreground flex h-dvh flex-col overflow-hidden">
	{#if inShell}
		{@render children()}
	{:else}
		<main class="mx-auto w-full max-w-3xl min-h-0 flex-1 overflow-y-auto px-4 py-8">
			{@render children()}
			<footer class="pt-6">
				<DeployedVersion />
			</footer>
		</main>
	{/if}
</div>
