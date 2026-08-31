<script lang="ts">
	import { Command } from 'bits-ui';
	import { createItemType, type ItemType } from '$lib/api.js';
	import { catalog, search } from '$lib/catalog.svelte.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		held,
		typed = $bindable(''),
		onchosen
	}: {
		household: number;
		held: number[];
		typed?: string;
		onchosen: (item: ItemType) => void;
	} = $props();

	const submission = new Submission();
	let reused = $state.raw<{ asked: string; name: string } | null>(null);

	let wanted = $derived(typed.trim());
	let results = $derived(wanted ? search(catalog.all, wanted) : []);

	function forget(event: KeyboardEvent) {
		if (event.key !== 'Escape' || !wanted) return;
		event.stopPropagation();
		typed = '';
	}

	function choose(item: ItemType) {
		reused = null;
		typed = '';
		submission.errors = [];
		onchosen(item);
	}

	function create() {
		const asked = wanted;
		if (!asked || submission.busy) return;
		submission.run(async () => {
			const { item, created } = await createItemType(household, asked);
			catalog.remember(item);
			reused = created ? null : { asked, name: item.name };
			if (typed.trim() === asked) typed = '';
			onchosen(item);
			return [];
		});
	}
</script>

<Command.Root shouldFilter={false} label={m.item_field_label()}>
	{#snippet child({ props })}
		<div {...props} role="presentation" class="grid gap-2">
			<Command.Input bind:value={typed}>
				{#snippet child({ props: field })}
					<Input
						{...field}
						bind:value={typed}
						onkeydown={forget}
						aria-expanded={wanted.length > 0}
						aria-label={m.item_field_label()}
						placeholder={m.item_field_label()}
						class="min-h-11"
						data-testid="item-field"
					/>
				{/snippet}
			</Command.Input>

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
														{m.item_in_kit()}
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
