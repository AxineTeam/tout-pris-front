<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { AuthError, ItemType, Kit, Person, TripItem } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { toggle } from '$lib/utils.js';

	let {
		item,
		kits,
		offered,
		lines,
		absent,
		errors,
		busy = false,
		whoever,
		onclose,
		onadvance,
		onstep,
		onremove,
		onadd,
		onedit,
		onpicking,
		onaddtokits
	}: {
		item: ItemType;
		kits: Kit[];
		offered: Kit[];
		lines: TripItem[];
		absent: (Person | null)[];
		errors: AuthError[];
		busy?: boolean;
		whoever: (person: Person | null) => string;
		onclose: () => void;
		onadvance: (line: TripItem) => void;
		onstep: (line: TripItem, by: number) => void;
		onremove: (line: TripItem) => void;
		onadd: (person: Person | null) => void;
		onedit: () => void;
		onpicking: () => void;
		onaddtokits: (kits: Kit[]) => Promise<boolean>;
	} = $props();

	let named = $derived(absent.filter((person) => person !== null));
	let common = $derived(absent.some((person) => person === null));

	// One dialog at a time, as the removal confirmation does: the picker takes
	// the sheet's place instead of standing on top of it.
	let picking = $state.raw(false);
	let picked = $state.raw<number[]>([]);

	let held = $derived(kits.map((kit) => kit.id));
	// A kit that already holds the object is ticked and locked: the API puts no
	// uniqueness on kit lines, so a second pass would silently double them.
	let chosen = $derived(offered.filter((kit) => picked.includes(kit.id) && !held.includes(kit.id)));

	const dashed =
		'border-border text-primary hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-2 rounded-xl border border-dashed px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] disabled:opacity-50';
</script>

{#if picking}
	<Modal
		title={m.trip_sheet_kits_title({ name: item.name })}
		description={offered.length > 0 ? m.trip_sheet_kits_explains() : undefined}
		onclose={() => (picking = false)}
	>
		{#if offered.length === 0}
			<p class="text-muted-foreground text-sm">{m.trip_kits_none()}</p>
		{:else}
			<ul class="grid min-w-0 gap-2">
				{#each offered as kit (kit.id)}
					{@const serving = held.includes(kit.id)}
					{@const taken = serving || picked.includes(kit.id)}
					<li>
						<RowCard
							aria-label={serving
								? m.trip_sheet_kit_serves({ name: kit.name })
								: m.trip_sheet_kit_pick({ name: kit.name })}
							aria-pressed={taken}
							disabled={serving || busy}
							onclick={() => (picked = toggle(picked, kit.id))}
							class={taken ? 'border-primary bg-accent' : undefined}
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-semibold">{kit.name}</span>
								{#if serving}
									<span class="text-muted-foreground block truncate text-xs">
										{m.trip_sheet_kit_held()}
									</span>
								{:else if kit.description}
									<span class="text-muted-foreground block truncate text-xs">
										{kit.description}
									</span>
								{/if}
							</span>
							{#if taken}
								<CheckIcon size={16} aria-hidden="true" class="text-primary flex-none" />
							{/if}
						</RowCard>
					</li>
				{/each}
			</ul>
			<FormErrors {errors} />
			<Button
				disabled={chosen.length === 0 || busy}
				onclick={async () => {
					// Back to the sheet on success, where the new chips say it worked;
					// a refusal keeps the picker up, with its error and its ticks.
					if (await onaddtokits(chosen)) picking = false;
				}}
			>
				{m.add()}
			</Button>
		{/if}
	</Modal>
{:else}
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

		<div class="flex flex-wrap items-center gap-1">
			{#each kits as kit (kit.id)}
				<span class="bg-accent text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">
					{kit.name}
				</span>
			{/each}
			<button
				type="button"
				data-testid="sheet-kits"
				onclick={() => {
					// Reopening starts from what the kits hold now, not from ticks left
					// over from a run that was abandoned or refused. The errors go with
					// them: they belong to whatever wrote last, which is rarely this.
					picked = [];
					onpicking();
					picking = true;
				}}
				class="border-border text-primary hover:bg-accent focus-visible:ring-ring/50 relative flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium transition-colors outline-none after:absolute after:-inset-3 after:content-[''] focus-visible:ring-[3px]"
			>
				<PlusIcon size={11} aria-hidden="true" />
				{m.trip_sheet_kits()}
			</button>
		</div>

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
					<PersonAvatar person={line.person} small />
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
{/if}
