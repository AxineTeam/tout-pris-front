<script lang="ts">
	import type { Kit, Person } from '$lib/api.js';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		kits,
		participants,
		kit = $bindable(null),
		person = $bindable(null)
	}: {
		kits: Kit[];
		participants: Person[];
		kit?: number | null;
		person?: number | null;
	} = $props();

	const chip =
		'focus-visible:ring-ring/50 flex min-h-9 flex-none items-center rounded-full border text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]';
	const on = 'border-primary bg-primary text-primary-foreground';
	const off = 'border-border bg-card text-foreground hover:bg-accent';
</script>

{#if kits.length > 0}
	<div role="group" aria-label={m.trip_filter_kits()} class="-mx-4 flex gap-2 overflow-x-auto px-4">
		<button
			type="button"
			aria-pressed={kit === null}
			onclick={() => (kit = null)}
			class={[chip, 'px-3', kit === null ? on : off]}
		>
			{m.trip_filter_all()}
		</button>
		{#each kits as one (one.id)}
			<button
				type="button"
				aria-pressed={kit === one.id}
				onclick={() => (kit = kit === one.id ? null : one.id)}
				class={[chip, 'px-3', kit === one.id ? on : off]}
			>
				{one.name}
			</button>
		{/each}
	</div>
{/if}

{#if participants.length > 0}
	<div
		role="group"
		aria-label={m.trip_filter_people()}
		class="-mx-4 flex gap-2 overflow-x-auto px-4"
	>
		<button
			type="button"
			aria-pressed={person === null}
			onclick={() => (person = null)}
			class={[chip, 'px-3', person === null ? on : off]}
		>
			{m.trip_filter_all()}
		</button>
		{#each participants as one (one.id)}
			<button
				type="button"
				aria-pressed={person === one.id}
				onclick={() => (person = person === one.id ? null : one.id)}
				class={[chip, 'gap-1.5 py-1 pr-3 pl-1', person === one.id ? on : off]}
			>
				<PersonAvatar id={one.id} name={one.name} small />
				{one.name}
			</button>
		{/each}
	</div>
{/if}
