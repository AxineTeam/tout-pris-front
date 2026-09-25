<script lang="ts" generics="Line extends { id: number; person: Person | null; quantity: number }">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import UsersIcon from '@lucide/svelte/icons/users';
	import type { Snippet } from 'svelte';
	import type { ItemType, Person } from '$lib/api.js';
	import PersonAvatar from '$lib/components/PersonAvatar.svelte';
	import QuantityStepper from '$lib/components/QuantityStepper.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		item,
		lines,
		absent,
		whoever,
		testid,
		movable = false,
		grabbed = false,
		offset = 0,
		highlighted = false,
		unfolded = false,
		busy = false,
		ongrab,
		onopen,
		onunfold,
		onadd,
		onless,
		onmore,
		controls,
		beside,
		trailing
	}: {
		item: ItemType;
		lines: Line[];
		absent: (Person | null)[];
		whoever: (person: Person | null) => string;
		testid: string;
		movable?: boolean;
		grabbed?: boolean;
		offset?: number;
		highlighted?: boolean;
		unfolded?: boolean;
		busy?: boolean;
		ongrab: (event: PointerEvent) => void;
		onopen?: () => void;
		onunfold: () => void;
		onadd: (person: Person | null) => void;
		onless: (line: Line) => void;
		onmore: (line: Line) => void;
		controls?: Snippet<[Line]>;
		beside?: Snippet;
		trailing?: Snippet;
	} = $props();

	let marked = $derived({ [`data-${testid}`]: item.id });
	let opened = $derived(absent.length > 0 && unfolded);
</script>

{#snippet title()}
	<span class="flex min-w-0 items-center gap-0.5">
		<span data-testid="{testid}-name" class="truncate text-sm font-semibold">{item.name}</span>
		{#if onopen}
			<ChevronRightIcon size={15} aria-hidden="true" class="text-muted-foreground flex-none" />
		{/if}
	</span>
	{#if item.description}
		<span class="text-muted-foreground truncate text-xs">{item.description}</span>
	{/if}
{/snippet}

{#snippet stepper(line: Line)}
	<QuantityStepper
		quantity={line.quantity}
		less={m.trip_quantity_less({ who: whoever(line.person) })}
		more={m.trip_quantity_more({ who: whoever(line.person) })}
		{busy}
		tight
		onless={() => onless(line)}
		onmore={() => onmore(line)}
	/>
	{@render controls?.(line)}
{/snippet}

<li
	data-row={item.id}
	{...marked}
	style:transform={grabbed ? `translateY(${offset}px)` : undefined}
	class={[
		'border-border bg-card grid min-w-0 gap-0.5 rounded-xl border pt-2 pr-3 pb-1 transition-colors',
		movable ? 'pl-1' : 'pl-3',
		(highlighted || grabbed) && 'border-primary bg-accent',
		grabbed && 'relative z-10 shadow-lg'
	]}
>
	<div class="flex min-h-9 min-w-0 items-start gap-2">
		{#if movable}
			<span
				aria-hidden="true"
				data-testid="{testid}-handle-{item.id}"
				onpointerdown={(event) => !busy && ongrab(event)}
				class="text-muted-foreground relative flex size-7 flex-none touch-none items-center justify-center after:absolute after:-inset-2 after:content-['']"
			>
				<GripHorizontalIcon size={16} />
			</span>
		{/if}
		{#if onopen}
			<button
				type="button"
				aria-label={m.trip_item_open({ name: item.name })}
				onclick={onopen}
				class="focus-visible:ring-ring/50 grid min-w-0 content-center rounded-md text-left outline-none focus-visible:ring-[3px]"
			>
				{@render title()}
			</button>
		{:else}
			<div class="grid min-w-0 content-center">
				{@render title()}
			</div>
		{/if}
		{@render beside?.()}
		{#if absent.length > 0 || trailing}
			<span class="ml-auto flex flex-none items-center gap-2">
				{#if absent.length > 0}
					<Button
						variant="ghost"
						size="icon"
						aria-label={m.trip_line_add_open({ name: item.name })}
						aria-expanded={unfolded}
						onclick={onunfold}
						class={[
							"relative size-8 flex-none after:absolute after:-inset-1.5 after:content-['']",
							unfolded ? 'bg-accent text-primary' : 'text-muted-foreground'
						]}
					>
						<UsersIcon class="size-[15px]" aria-hidden="true" />
					</Button>
				{/if}
				{@render trailing?.()}
			</span>
		{/if}
	</div>

	<ul class="bg-background grid min-w-0">
		{#each lines as line (line.id)}
			<li class="border-border/60 flex min-h-9 min-w-0 items-center gap-2 border-t">
				<PersonAvatar person={line.person} small />
				<span class="min-w-0 flex-1 truncate text-[13.5px] font-medium">
					{whoever(line.person)}
				</span>
				{@render stepper(line)}
			</li>
		{/each}

		{#if opened}
			<li
				class="border-border/60 flex min-h-11 min-w-0 flex-wrap items-center gap-x-1.5 border-t py-1"
			>
				<span class="text-muted-foreground flex-none pr-0.5 text-xs">{m.trip_line_add()}</span>
				{#each absent as person (person?.id ?? 'everyone')}
					<button
						type="button"
						aria-label={m.trip_line_add_for({ who: whoever(person) })}
						disabled={busy}
						onclick={() => onadd(person)}
						class="hover:bg-accent focus-visible:ring-ring/50 flex min-h-11 min-w-0 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 opacity-60 transition-opacity outline-none hover:opacity-100 focus-visible:ring-[3px] disabled:opacity-40"
					>
						<PersonAvatar {person} small />
						<span class="truncate text-xs font-medium">{whoever(person)}</span>
					</button>
				{/each}
			</li>
		{/if}
	</ul>
</li>
