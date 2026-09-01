<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { ItemType, Kit, Person, TripItem } from '$lib/api.js';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		item,
		kits,
		lines,
		absent,
		busy = false,
		whoever,
		onclose,
		onadvance,
		onstep,
		onremove,
		onadd,
		onedit
	}: {
		item: ItemType;
		kits: Kit[];
		lines: TripItem[];
		absent: (Person | null)[];
		busy?: boolean;
		whoever: (person: Person | null) => string;
		onclose: () => void;
		onadvance: (line: TripItem) => void;
		onstep: (line: TripItem, by: number) => void;
		onremove: (line: TripItem) => void;
		onadd: (person: Person | null) => void;
		onedit: () => void;
	} = $props();

	let named = $derived(absent.filter((person) => person !== null));
	let common = $derived(absent.some((person) => person === null));

	const dashed =
		'border-border text-primary hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-50';
</script>

<Modal title={item.name} description={item.description || undefined} {onclose}>
	{#snippet action()}
		<button
			type="button"
			aria-label={m.item_edit({ name: item.name })}
			onclick={onedit}
			class="text-muted-foreground hover:bg-accent focus-visible:ring-ring/50 -my-2 flex size-11 flex-none items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px]"
		>
			<PencilIcon class="size-[17px]" aria-hidden="true" />
		</button>
	{/snippet}

	{#if kits.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each kits as kit (kit.id)}
				<span class="bg-accent text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
					{kit.name}
				</span>
			{/each}
		</div>
	{/if}

	<p class="text-muted-foreground text-[10.5px] font-semibold tracking-[0.08em] uppercase">
		{m.trip_sheet_lines()}
	</p>

	<ul class="grid gap-1.5">
		{#each lines as line (line.id)}
			<li
				data-line={line.id}
				style:background-color="color-mix(in oklab, {line.status.color} 9%, transparent)"
				class="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2"
			>
				{#if line.person}
					<PersonAvatar id={line.person.id} name={line.person.name} small />
				{:else}
					<span
						aria-hidden="true"
						class="bg-muted-foreground text-avatar-foreground flex size-7 flex-none items-center justify-center rounded-full text-xs font-semibold"
					>
						∗
					</span>
				{/if}
				<span class="grid min-w-0 flex-1 justify-items-start gap-1">
					<span class="truncate text-[13.5px] font-semibold">{whoever(line.person)}</span>
					<StatusPill
						status={line.status}
						label={m.trip_status_advance({
							name: item.name,
							who: whoever(line.person),
							status: line.status.name
						})}
						{busy}
						onadvance={() => onadvance(line)}
					/>
				</span>
				<QuantityStepper
					quantity={line.quantity}
					less={m.trip_quantity_less({ who: whoever(line.person) })}
					more={m.trip_quantity_more({ who: whoever(line.person) })}
					{busy}
					onless={() => onstep(line, -1)}
					onmore={() => onstep(line, 1)}
				/>
				<button
					type="button"
					aria-label={m.trip_line_remove_title({ name: item.name, who: whoever(line.person) })}
					disabled={busy}
					onclick={() => onremove(line)}
					class="text-destructive hover:bg-destructive/10 focus-visible:ring-ring/50 flex size-9 flex-none items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-50"
				>
					<Trash2Icon size={16} aria-hidden="true" />
				</button>
			</li>
		{/each}
	</ul>

	{#if named.length > 0}
		<div class="grid gap-1.5">
			{#each named as person (person.id)}
				<button
					type="button"
					disabled={busy}
					onclick={() => onadd(person)}
					class={dashed}
					data-testid="sheet-add-{person.id}"
				>
					<UserPlusIcon size={16} aria-hidden="true" />
					{m.trip_line_add_for({ who: person.name })}
				</button>
			{/each}
		</div>
	{/if}

	{#if common}
		<button
			type="button"
			disabled={busy}
			onclick={() => onadd(null)}
			class={dashed}
			data-testid="sheet-add-common"
		>
			<UsersIcon size={16} aria-hidden="true" />
			{m.trip_sheet_add_common()}
		</button>
	{/if}
</Modal>
