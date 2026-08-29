<script lang="ts">
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import type { AuthError } from '$lib/api.js';
	import { fieldClass } from '$lib/components/AccountScreen.svelte';
	import FieldErrors from '$lib/components/FieldErrors.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		id,
		name,
		autocomplete,
		describes,
		errors = [],
		value = $bindable()
	}: {
		id: string;
		name?: string;
		autocomplete: 'current-password' | 'new-password';
		describes: string;
		errors?: AuthError[];
		value: string;
	} = $props();

	let revealed = $state(false);
	let action = $derived(
		revealed ? m.password_hide({ field: describes }) : m.password_show({ field: describes })
	);
	let failed = $derived(errors.length > 0);
</script>

<div class="grid gap-[7px]">
	<div class="relative">
		<Input
			{id}
			{name}
			{autocomplete}
			type={revealed ? 'text' : 'password'}
			autocapitalize="none"
			spellcheck={false}
			aria-invalid={failed}
			aria-describedby={failed ? `${id}-errors` : undefined}
			class="{fieldClass} pr-12"
			bind:value
		/>
		<button
			type="button"
			aria-label={action}
			aria-controls={id}
			class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
			onclick={() => (revealed = !revealed)}
		>
			{#if revealed}
				<EyeOffIcon size={18} aria-hidden="true" />
			{:else}
				<EyeIcon size={18} aria-hidden="true" />
			{/if}
		</button>
	</div>
	<FieldErrors id="{id}-errors" {errors} />
</div>
