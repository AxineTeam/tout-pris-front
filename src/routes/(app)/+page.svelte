<script lang="ts">
	import BackendStatus from '$lib/components/BackendStatus.svelte';
	import { session } from '$lib/session.svelte.js';
</script>

<div class="space-y-6">
	<p data-testid="welcome">Connecté en tant que {session.user?.display}.</p>
	<BackendStatus />
</div>
