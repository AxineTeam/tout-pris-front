<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';
	import { navigating, page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { onSessionExpired } from '$lib/api.js';
	import DeployedVersion from '$lib/components/DeployedVersion.svelte';
	import { forgetVisited } from '$lib/households.js';
	import { locale } from '$lib/locale.svelte.js';
	import { goToLogin } from '$lib/navigation.js';
	import { queryClient } from '$lib/query.js';
	import { session } from '$lib/session.svelte.js';
	import { theme } from '$lib/theme.svelte.js';

	let { children }: { children: Snippet } = $props();

	let inShell = $derived(page.route.id?.startsWith('/(app)') ?? false);

	// La session est morte : plus rien du cache ne nous appartient, et il faut
	// repartir vers la connexion. `invalidateAll()` le faisait indirectement, en
	// rejouant la garde de `(app)/+layout.ts` ; le dire ici évite d'avoir à
	// recharger tous les écrans pour obtenir une redirection.
	// Le 401 tombe le plus souvent dans le `load` de la page demandée, que `page`
	// ne porte pas encore : c'est `navigating.to` qui la connaît, et c'est là
	// qu'il faut revenir après reconnexion.
	onSessionExpired(() => {
		session.expire();
		queryClient.clear();
		forgetVisited();
		const asked = navigating.to?.url ?? page.url;
		void goToLogin(asked.pathname + asked.search);
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

<QueryClientProvider client={queryClient}>
	<div class="bg-background text-foreground flex h-dvh flex-col overflow-hidden">
		{#if inShell}
			{@render children()}
		{:else}
			<main class="min-h-0 flex-1 overflow-y-auto px-[22px]">
				<div class="mx-auto flex min-h-full w-full max-w-[340px] flex-col">
					{@render children()}
					<footer class="flex justify-center pb-6">
						<DeployedVersion />
					</footer>
				</div>
			</main>
		{/if}
	</div>
</QueryClientProvider>
