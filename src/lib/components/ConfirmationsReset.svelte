<script lang="ts">
	import type { Snippet } from 'svelte';
	import ActionButton from '$lib/components/ActionButton.svelte';
	import Section from '$lib/components/Section.svelte';
	import { confirmations } from '$lib/confirmations.svelte.js';
	import * as m from '$lib/paraglide/messages.js';

	let { heading }: { heading: Snippet } = $props();
</script>

{#if confirmations.anySilenced}
	<Section {heading}>
		<ActionButton
			variant="outline"
			label={m.me_confirmations_restore()}
			onclick={() => confirmations.askAgain()}
		/>
	</Section>
{/if}
