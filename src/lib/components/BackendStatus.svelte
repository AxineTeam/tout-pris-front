<script lang="ts">
	import { getHealth } from '$lib/api.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let status = $state<string | null>(null);
	let failed = $state(false);

	async function load() {
		try {
			status = (await getHealth()).status;
		} catch {
			failed = true;
		}
	}

	load();
</script>

{#if failed}
	<Alert.Root variant="destructive">
		<Alert.Title>Backend injoignable</Alert.Title>
		<Alert.Description>L'API n'a pas répondu sur /api/health/.</Alert.Description>
	</Alert.Root>
{:else}
	<Card.Root>
		<Card.Header>
			<Card.Title>Backend</Card.Title>
			<Card.Description>État de l'API Tout Pris.</Card.Description>
		</Card.Header>
		<Card.Content>
			<p data-testid="backend-status" class="text-muted-foreground">
				{status ?? 'Vérification…'}
			</p>
		</Card.Content>
	</Card.Root>
{/if}
