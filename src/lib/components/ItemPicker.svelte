<script lang="ts">
	import InfoIcon from '@lucide/svelte/icons/info';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { Command } from 'bits-ui';
	import { createItemType, type ItemType } from '$lib/api.js';
	import { remember, rewriteItems, search } from '$lib/catalog.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import ItemImport from '$lib/components/ItemImport.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { PASTE_LIMIT, parseItems } from '$lib/imports.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		items,
		held,
		holding,
		busy = false,
		typed = $bindable(''),
		onchosen,
		onadopt,
		onrefresh
	}: {
		household: number;
		items: ItemType[];
		held: number[];
		holding: string;
		busy?: boolean;
		typed?: string;
		onchosen: (item: ItemType) => void;
		onadopt: (item: ItemType) => Promise<unknown>;
		onrefresh: () => Promise<void>;
	} = $props();

	const submission = new Submission();
	let field = $state.raw<HTMLInputElement | null>(null);
	let reused = $state.raw<{ asked: string; name: string } | null>(null);
	// The pasted text, empty when the window was opened to be read rather than to
	// import. Null is closed.
	let importing = $state.raw<string | null>(null);

	let wanted = $derived(typed.trim());
	let results = $derived(wanted ? search(items, wanted) : []);

	// A single name stays typed text, trailing newline and all — notes and
	// spreadsheets add one — and so does a paste of nothing but blank lines.
	function importList(event: ClipboardEvent) {
		const list = event.clipboardData?.getData('text/plain') ?? '';
		const oversized = list.length > PASTE_LIMIT;
		if (!oversized && parseItems(list).length < 2) return;
		event.preventDefault();
		if (busy) return;
		importing = list;
	}

	function forget(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !wanted) return;
		event.stopPropagation();
		typed = '';
	}

	// Keeping the focus keeps the soft keyboard up, and the browser holds a
	// focused field in view whatever `preventScroll` says — which fights the jump
	// to an object the list already carries. So the field only keeps the focus
	// when the next gesture is another name.
	function focusUnlessJumping(item: ItemType) {
		if (held.includes(item.id)) field?.blur();
		else field?.focus({ preventScroll: true });
	}

	function choose(item: ItemType) {
		reused = null;
		typed = '';
		submission.errors = [];
		focusUnlessJumping(item);
		onchosen(item);
	}

	function create() {
		const asked = wanted;
		if (!asked || submission.busy) return;
		field?.focus({ preventScroll: true });
		submission.run(async () => {
			const { item, created } = await createItemType(household, asked);
			rewriteItems(household, (all) => remember(all, item));
			reused = created ? null : { asked, name: item.name };
			if (typed.trim() === asked) typed = '';
			focusUnlessJumping(item);
			onchosen(item);
			return [];
		});
	}
</script>

<Command.Root shouldFilter={false} label={m.item_field_label()}>
	{#snippet child({ props })}
		<div {...props} role="presentation" class="grid gap-1.5">
			<div class="relative">
				<SearchIcon
					size={16}
					aria-hidden="true"
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
				/>
				<Command.Input bind:value={typed}>
					{#snippet child({ props: input })}
						<Input
							{...input}
							bind:ref={field}
							bind:value={typed}
							onkeydown={forget}
							onpaste={importList}
							aria-expanded={wanted.length > 0}
							aria-label={m.item_field_label()}
							placeholder={m.item_field_label()}
							class="bg-muted focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-[10px] border-transparent pr-11 pl-9 focus-visible:ring-[3px]"
							data-testid="item-field"
						/>
					{/snippet}
				</Command.Input>
				<Button
					variant="ghost"
					size="icon"
					aria-label={m.item_import_open()}
					disabled={busy}
					onclick={() => (importing = '')}
					class="text-muted-foreground absolute top-1/2 right-0 size-11 -translate-y-1/2 rounded-full"
					data-testid="item-import-open"
				>
					<InfoIcon class="size-[18px]" aria-hidden="true" />
				</Button>
			</div>

			<FormErrors errors={submission.errors} />

			{#if reused}
				<p class="text-muted-foreground text-xs" data-testid="item-reused">
					{m.item_reused(reused)}
				</p>
			{/if}

			{#if wanted}
				<Command.List>
					{#snippet child({ props: list })}
						<div {...list} role="presentation" aria-label={undefined}>
							<Command.Viewport
								role="listbox"
								aria-label={m.item_results_label()}
								class="grid gap-2"
							>
								{#each results as item (item.id)}
									<Command.Item value={String(item.id)} onSelect={() => choose(item)}>
										{#snippet child({ props: option })}
											<RowCard {...option} tabindex={-1} class="data-selected:bg-accent">
												<span class="min-w-0 flex-1">
													<span class="block truncate text-sm font-semibold">{item.name}</span>
													{#if item.description}
														<span class="text-muted-foreground block truncate text-xs">
															{item.description}
														</span>
													{/if}
												</span>
												{#if held.includes(item.id)}
													<span
														class="bg-muted text-muted-foreground flex-none rounded-full px-2 py-0.5 text-[10px]"
													>
														{holding}
													</span>
												{/if}
											</RowCard>
										{/snippet}
									</Command.Item>
								{/each}
								<Command.Item value="create" onSelect={create}>
									{#snippet child({ props: option })}
										<AddCard
											{...option}
											onclick={create}
											tabindex={-1}
											disabled={submission.busy}
											label={m.item_create({ name: wanted })}
											class="data-selected:bg-accent"
											data-testid="item-create"
										/>
									{/snippet}
								</Command.Item>
							</Command.Viewport>
						</div>
					{/snippet}
				</Command.List>
			{/if}
		</div>
	{/snippet}
</Command.Root>

{#if importing !== null}
	<ItemImport
		{household}
		{held}
		pasted={importing}
		{onadopt}
		{onrefresh}
		onclose={() => (importing = null)}
	/>
{/if}
