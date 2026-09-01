<script lang="ts">
	import type { ItemStatus, Kit, Person } from '$lib/api.js';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		kits,
		participants,
		statuses,
		kit = $bindable(null),
		person = $bindable(null),
		status = $bindable(null)
	}: {
		kits: Kit[];
		participants: Person[];
		statuses: ItemStatus[];
		kit?: number | null;
		person?: number | null;
		status?: number | null;
	} = $props();

	const chip =
		"focus-visible:ring-ring/50 relative flex h-8 flex-none items-center rounded-full border text-xs font-medium whitespace-nowrap transition-colors outline-none after:absolute after:-inset-y-1.5 after:content-[''] focus-visible:ring-[3px]";
	const on = 'border-primary bg-primary text-primary-foreground';
	const off = 'border-border bg-card text-foreground hover:bg-accent';
</script>

{#if kits.length > 0}
	<div
		role="group"
		aria-label={m.trip_filter_kits()}
		class="-mx-4 flex gap-1.5 overflow-x-auto px-4"
	>
		<button
			type="button"
			aria-pressed={kit === null}
			onclick={() => (kit = null)}
			class={[chip, 'px-2.5', kit === null ? on : off]}
		>
			{m.trip_filter_all()}
		</button>
		{#each kits as one (one.id)}
			<button
				type="button"
				aria-pressed={kit === one.id}
				onclick={() => (kit = kit === one.id ? null : one.id)}
				class={[chip, 'px-2.5', kit === one.id ? on : off]}
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
		class="-mx-4 flex gap-1.5 overflow-x-auto px-4"
	>
		<button
			type="button"
			aria-pressed={person === null}
			onclick={() => (person = null)}
			class={[chip, 'px-2.5', person === null ? on : off]}
		>
			{m.trip_filter_all()}
		</button>
		{#each participants as one (one.id)}
			<button
				type="button"
				aria-pressed={person === one.id}
				onclick={() => (person = person === one.id ? null : one.id)}
				class={[chip, 'gap-1.5 pr-2.5 pl-1', person === one.id ? on : off]}
			>
				<PersonAvatar id={one.id} name={one.name} small />
				{one.name}
			</button>
		{/each}
	</div>
{/if}

{#if statuses.length > 0}
	<div
		role="group"
		aria-label={m.trip_filter_statuses()}
		class="-mx-4 flex gap-1.5 overflow-x-auto px-4"
	>
		<button
			type="button"
			aria-pressed={status === null}
			onclick={() => (status = null)}
			class={[chip, 'px-2.5', status === null ? on : off]}
		>
			{m.trip_filter_all()}
		</button>
		{#each statuses as one (one.id)}
			<button
				type="button"
				aria-pressed={status === one.id}
				onclick={() => (status = status === one.id ? null : one.id)}
				class={[chip, 'gap-1.5 px-2.5', status === one.id ? on : off]}
			>
				<span
					aria-hidden="true"
					class="size-[9px] flex-none rounded-full"
					style:background-color={one.color}
				></span>
				{one.name}
			</button>
		{/each}
	</div>
{/if}
