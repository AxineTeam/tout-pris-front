<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { Household, Kit } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { householdLabel } from '$lib/households.js';
	import { copyKit, type CopyReport } from '$lib/kits.js';
	import * as m from '$lib/paraglide/messages.js';
	import { householdKey, queryClient } from '$lib/query.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		kit,
		households,
		mode,
		onmoved,
		onclose
	}: {
		household: number;
		kit: Kit;
		households: Household[];
		mode: 'copy' | 'move';
		onmoved?: () => void;
		onclose: () => void;
	} = $props();

	const submission = new Submission();
	let chosen = $state.raw<Household | null>(null);
	let done = $state.raw<number | null>(null);
	let total = $state.raw(0);
	let report = $state.raw<CopyReport | null>(null);
	// Nothing on screen reads it, only the closure the loop holds — which is why
	// it still answers once this component is gone.
	let stopping = false;

	let others = $derived(households.filter((known) => known.id !== household));
	let advance = $derived(m.kit_copy_progress({ done: done ?? 0, total }));
	let words = $derived(
		mode === 'move'
			? {
					title: m.kit_move_title({ name: kit.name }),
					explains: m.kit_move_explains(),
					alone: m.kit_move_alone(),
					start: m.kit_move_start(),
					target: (name: string) => m.kit_move_target({ name })
				}
			: {
					title: m.kit_copy_title({ name: kit.name }),
					explains: m.kit_copy_explains(),
					alone: m.kit_copy_alone(),
					start: m.kit_copy_start(),
					target: (name: string) => m.kit_copy_target({ name })
				}
	);

	// Leaving stops the run rather than outliving it behind a closed door: what
	// has landed stays, and the kits of the household that received it show it.
	function leave() {
		stopping = true;
		onclose();
	}

	function start(destination: Household) {
		submission.run(async () => {
			done = 0;
			try {
				const outcome = await copyKit({
					household,
					kit: kit.id,
					destination: destination.id,
					move: mode === 'move',
					progressed: (reached, count) => {
						if (stopping) return;
						done = reached;
						total = count;
					},
					stopped: () => stopping
				});
				// Told even behind a closed door: the kit is gone from the household
				// this box was opened in, and every screen still showing it lies.
				if (outcome.moved) onmoved?.();
				// Once asked to leave, this box has no reader left: what it would draw
				// goes nowhere.
				if (!stopping) report = outcome;
			} finally {
				done = null;
				// Its kits and its catalog both moved, and every one of their keys
				// extends the household's. Owed even when the run threw, since the
				// deletion that closes a move comes after everything has landed.
				await queryClient.invalidateQueries({ queryKey: householdKey(destination.id) });
			}
			return [];
		});
	}
</script>

<Modal title={words.title} onclose={leave}>
	<div class="grid gap-3" data-testid="kit-copy">
		<!-- A live region has to be watched before it changes: appearing along with
		the recap, it would be read by no one. This one is here from the start and
		holds both the progress and the recap. -->
		<div role="status" class="grid gap-3 empty:hidden">
			{#if report && chosen}
				{@const landed = { count: report.copied, household: householdLabel(chosen) }}
				<p class="text-sm font-semibold wrap-anywhere" data-testid="kit-copy-done">
					{report.moved ? m.kit_move_done(landed) : m.kit_copy_done(landed)}
				</p>
				{#if mode === 'move' && !report.moved}
					<p class="text-sm" data-testid="kit-copy-kept">{m.kit_move_kept()}</p>
				{/if}
				{#if report.refused.length > 0}
					<ul class="text-muted-foreground grid gap-1 text-xs" data-testid="kit-copy-refusals">
						{#each report.refused as refusal (refusal.name)}
							<li class="wrap-anywhere">{m.kit_copy_refusal(refusal)}</li>
						{/each}
					</ul>
				{/if}
			{:else if done !== null}
				<p class="text-sm" data-testid="kit-copy-progress">{advance}</p>
			{/if}
		</div>

		{#if report === null}
			{#if done !== null}
				<div
					role="progressbar"
					aria-label={words.title}
					aria-valuenow={done}
					aria-valuemin={0}
					aria-valuemax={total}
					aria-valuetext={advance}
					class="bg-muted h-1.5 overflow-hidden rounded-full"
				>
					<div
						style:width="{total > 0 ? (done / total) * 100 : 0}%"
						class="bg-primary h-full transition-[width]"
					></div>
				</div>
			{:else if others.length === 0}
				<p class="text-sm" data-testid="kit-copy-alone">{words.alone}</p>
			{:else}
				<p class="text-muted-foreground text-sm">{words.explains}</p>
				<ul class="grid min-w-0 gap-2">
					{#each others as candidate (candidate.id)}
						{@const taken = chosen?.id === candidate.id}
						<li>
							<RowCard
								aria-label={words.target(householdLabel(candidate))}
								aria-pressed={taken}
								onclick={() => (chosen = candidate)}
								class={taken ? 'border-primary bg-accent' : undefined}
							>
								<span class="min-w-0 flex-1 truncate text-sm font-semibold">
									{householdLabel(candidate)}
								</span>
								{#if taken}
									<CheckIcon size={16} aria-hidden="true" class="text-primary flex-none" />
								{/if}
							</RowCard>
						</li>
					{/each}
				</ul>
				<Button
					disabled={chosen === null || submission.busy}
					onclick={() => chosen && start(chosen)}
					data-testid="kit-copy-start"
				>
					{words.start}
				</Button>
			{/if}
		{/if}

		<FormErrors errors={submission.errors} />
	</div>
</Modal>
