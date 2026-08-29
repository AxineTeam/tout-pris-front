<script lang="ts">
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		id,
		name,
		autocomplete,
		describes,
		value = $bindable()
	}: {
		id: string;
		name?: string;
		autocomplete: 'current-password' | 'new-password';
		describes: string;
		value: string;
	} = $props();

	let revealed = $state(false);
	let action = $derived(
		revealed ? m.password_hide({ field: describes }) : m.password_show({ field: describes })
	);
</script>

<div class="relative">
	<Input
		{id}
		{name}
		{autocomplete}
		type={revealed ? 'text' : 'password'}
		class="pr-10"
		bind:value
	/>
	<button
		type="button"
		aria-label={action}
		aria-controls={id}
		class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex items-center rounded-md px-3 outline-none focus-visible:ring-[3px]"
		onclick={() => (revealed = !revealed)}
	>
		{#if revealed}
			<EyeOffIcon size={16} aria-hidden="true" />
		{:else}
			<EyeIcon size={16} aria-hidden="true" />
		{/if}
	</button>
</div>
