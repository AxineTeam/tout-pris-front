<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { onSessionExpired } from '$lib/api.js';
	import DeployedVersion from '$lib/components/DeployedVersion.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { households } from '$lib/households.svelte.js';
	import { session } from '$lib/session.svelte.js';

	let { children }: { children: Snippet } = $props();

	onSessionExpired(() => {
		session.expire();
		households.reset();
	});

	async function disconnect() {
		await session.logOut();
		households.reset();
		await goto(resolve('/account/login'));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Tout Pris</title>
</svelte:head>

<div class="bg-background text-foreground flex min-h-screen flex-col">
	<header class="border-b">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
			<a href={resolve('/')} class="text-lg font-semibold tracking-tight">Tout Pris</a>
			{#if session.authenticated}
				<a
					class="text-muted-foreground ml-auto text-sm underline"
					href={resolve('/(app)/me')}
					data-testid="account-email"
				>
					{session.user?.email}
				</a>
				<Button variant="outline" size="sm" onclick={disconnect}>Se déconnecter</Button>
			{/if}
		</div>
	</header>
	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
		{@render children()}
	</main>
	<footer class="mx-auto w-full max-w-3xl px-4 pb-6">
		<DeployedVersion />
	</footer>
</div>
