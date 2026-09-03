<script lang="ts">
	import type { ItemType } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		IMPORT_LIMIT,
		PASTE_LIMIT,
		importItems,
		parseItems,
		type ImportReport
	} from '$lib/imports.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	const PREVIEWED = 5;

	let {
		household,
		held,
		pasted,
		onadopt,
		onrefresh,
		onclose
	}: {
		household: number;
		held: number[];
		pasted: string;
		onadopt: (item: ItemType) => Promise<unknown>;
		onrefresh: () => Promise<void>;
		onclose: () => void;
	} = $props();

	const submission = new Submission();
	let done = $state.raw<number | null>(null);
	let report = $state.raw<ImportReport | null>(null);
	// Nothing on screen reads it, only the closure the loop holds — which is why
	// it still answers once this component is gone.
	let stopping = false;

	// A paste too big to be an item list is never turned into one: parsing it
	// first would allocate an object per line to then say there are too many.
	let oversized = $derived(pasted.length > PASTE_LIMIT);
	let wanted = $derived(oversized ? [] : parseItems(pasted));
	let advance = $derived(m.item_import_progress({ done: done ?? 0, total: wanted.length }));

	// Leaving stops the run rather than outliving it behind a closed door: a
	// reload would leave a half-done import anyway, so the screen tolerates one,
	// and refusing to stop would only be a door shut on someone who said stop.
	// The recap goes with it — the kit behind shows what landed.
	function leave() {
		stopping = true;
		onclose();
	}

	function start() {
		submission.run(async () => {
			done = 0;
			const outcome = await importItems({
				household,
				wanted,
				held,
				adopt: onadopt,
				progressed: (reached) => !stopping && (done = reached),
				stopped: () => stopping
			});
			// Once asked to leave, this box has no reader left: what it would draw
			// goes nowhere, and the refresh below is the only thing still owed.
			if (!stopping) {
				done = null;
				report = outcome;
			}
			await onrefresh();
			return [];
		});
	}
</script>

<Modal title={m.item_import_title()} onclose={leave}>
	<div class="grid gap-3" data-testid="item-import">
		<!-- A live region has to be watched before it changes: appearing along with
		the recap, it would be read by no one. This one is here from the start and
		holds both the progress and the recap. -->
		<div role="status" class="grid gap-3 empty:hidden">
			{#if report}
				<ul class="grid gap-1 text-sm">
					<li data-testid="item-import-created">
						{m.item_import_created({ count: report.created })}
					</li>
					<li data-testid="item-import-reused">{m.item_import_reused({ count: report.reused })}</li>
					<li data-testid="item-import-refused">
						{m.item_import_refused({ count: report.refused.length })}
					</li>
				</ul>
				{#if report.refused.length > 0}
					<ul class="text-muted-foreground grid gap-1 text-xs">
						{#each report.refused as refusal (refusal.line)}
							<li class="wrap-anywhere">{m.item_import_refusal(refusal)}</li>
						{/each}
					</ul>
				{/if}
			{:else if done !== null}
				<p class="text-sm" data-testid="item-import-progress">{advance}</p>
			{/if}
		</div>

		{#if report === null}
			{#if done !== null}
				<div
					role="progressbar"
					aria-label={m.item_import_title()}
					aria-valuenow={done}
					aria-valuemin={0}
					aria-valuemax={wanted.length}
					aria-valuetext={advance}
					class="bg-muted h-1.5 overflow-hidden rounded-full"
				>
					<div
						style:width="{wanted.length > 0 ? (done / wanted.length) * 100 : 0}%"
						class="bg-primary h-full transition-[width]"
					></div>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">
					{m.item_import_rules({ limit: IMPORT_LIMIT })}
				</p>
				{#if oversized}
					<p class="text-sm" data-testid="item-import-too-big">
						{m.item_import_too_big({ limit: IMPORT_LIMIT })}
					</p>
				{:else if wanted.length === 0}
					<p class="text-sm">{m.item_import_paste()}</p>
				{:else if wanted.length > IMPORT_LIMIT}
					<p class="text-sm" data-testid="item-import-too-many">
						{m.item_import_limit({ count: wanted.length, limit: IMPORT_LIMIT })}
					</p>
				{:else}
					<p class="text-sm font-semibold" data-testid="item-import-detected">
						{m.item_import_detected({ count: wanted.length })}
					</p>
					<ul class="text-muted-foreground grid gap-0.5 text-xs">
						{#each wanted.slice(0, PREVIEWED) as one (one.line)}
							<li class="truncate">{one.name}</li>
						{/each}
					</ul>
					<Button onclick={start} data-testid="item-import-start">
						{m.item_import_start({ count: wanted.length })}
					</Button>
				{/if}
			{/if}
		{/if}

		<FormErrors errors={submission.errors} />
	</div>
</Modal>
