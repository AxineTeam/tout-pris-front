<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Tout Pris</title>
</svelte:head>

<div class="bg-background text-foreground min-h-screen">
	<header class="border-b">
		<div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
			<a href="/" class="text-lg font-semibold tracking-tight">Tout Pris</a>
		</div>
	</header>
	<main class="mx-auto max-w-3xl px-4 py-8">
		{@render children()}
	</main>
</div>
