<script lang="ts">
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import {
		createItemStatus,
		deleteItemStatus,
		updateItemStatus,
		type ItemStatus,
		type ProgressCategory
	} from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { PROGRESS_ORDER, SectionedReordering, suggestedColor } from '$lib/statuses.js';
	import { Submission } from '$lib/submission.svelte.js';

	type Opened =
		| { kind: 'add'; progress: ProgressCategory }
		| { kind: 'edit'; status: ItemStatus }
		| { kind: 'remove'; status: ItemStatus };

	let {
		household,
		statuses,
		onchanged
	}: { household: number; statuses: ItemStatus[]; onchanged: () => void } = $props();

	const submission = new Submission();
	let opened = $state.raw<Opened | null>(null);
	let typed = $state('');
	let tinted = $state('');
	let sectioned = $state<ProgressCategory>('not_started');

	const dropping = new Submission();
	const dragging = new SectionedReordering(() => statuses);

	let titles = $derived<Record<ProgressCategory, { title: string; counts: string }>>({
		not_started: { title: m.progress_not_started(), counts: m.progress_not_started_counts() },
		in_progress: { title: m.progress_in_progress(), counts: m.progress_in_progress_counts() },
		done: { title: m.progress_done(), counts: m.progress_done_counts() }
	});

	function of(progress: ProgressCategory): ItemStatus[] {
		return dragging.rows.filter((status) => status.progress === progress);
	}

	function open(next: Opened) {
		submission.errors = [];
		typed = next.kind === 'edit' ? next.status.name : '';
		tinted = next.kind === 'add' ? suggestedColor(next.progress) : next.status.color;
		sectioned = next.kind === 'add' ? next.progress : next.status.progress;
		opened = next;
	}

	function act(call: () => Promise<unknown>) {
		submission.run(async () => {
			await call();
			opened = null;
			onchanged();
			return [];
		});
	}

	function add(event: SubmitEvent, progress: ProgressCategory) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		act(() => createItemStatus(household, name, tinted, progress));
	}

	function save(event: SubmitEvent, status: ItemStatus) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		const moved = sectioned === status.progress ? {} : { progress: sectioned };
		act(() => updateItemStatus(household, status.id, { name, color: tinted, ...moved }));
	}

	function drop() {
		const move = dragging.drop();
		if (!move) return;
		const progress = dragging.rows[move.to].progress;
		if (move.to === move.from && progress === move.row.progress) return;
		dropping.run(async () => {
			try {
				await updateItemStatus(household, move.row.id, { progress, position: move.to });
			} catch (refusal) {
				dragging.forget();
				onchanged();
				throw refusal;
			}
			onchanged();
			return [];
		});
	}
</script>

{#snippet swatch(color: string)}
	<span
		aria-hidden="true"
		class="border-border flex size-[26px] flex-none items-center justify-center rounded-lg border"
	>
		<span class="size-[13px] rounded-full" style:background-color={color}></span>
	</span>
{/snippet}

{#snippet section()}
	<div class="grid gap-2">
		<Label for="status-section">{m.status_section_label()}</Label>
		<select
			id="status-section"
			bind:value={sectioned}
			class="border-input h-11 w-full rounded-md border bg-transparent px-3 text-sm"
		>
			{#each PROGRESS_ORDER as progress (progress)}
				<option value={progress}>{titles[progress].title}</option>
			{/each}
		</select>
	</div>
{/snippet}

<svelte:window
	onpointermove={(event) => dragging.drag(event)}
	onpointerup={drop}
	onpointercancel={() => dragging.cancel()}
/>

<div {@attach dragging.anchored} class={['grid gap-4', dragging.grabbed && 'select-none']}>
	<p class="bg-muted text-muted-foreground rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed">
		{m.statuses_intro()}
	</p>

	<FormErrors errors={dropping.errors} />

	{#each PROGRESS_ORDER as progress (progress)}
		<section
			class="border-border bg-card grid gap-1.5 rounded-xl border px-3 pt-3 pb-1"
			data-section={progress}
			data-testid="status-group-{progress}"
		>
			<div class="flex items-baseline gap-2">
				<h2 class="text-sm font-semibold">{titles[progress].title}</h2>
				<span class="text-muted-foreground text-[11.5px]">{titles[progress].counts}</span>
			</div>

			<ul class="grid min-w-0">
				{#each of(progress) as status (status.id)}
					<li
						data-row={status.id}
						style:transform={dragging.grabbed?.id === status.id
							? `translateY(${dragging.offset}px)`
							: undefined}
						class={[
							'border-border/60 flex min-h-11 min-w-0 items-center gap-1.5 border-t',
							dragging.grabbed?.id === status.id && 'bg-card relative z-10 shadow-lg'
						]}
					>
						<span
							aria-hidden="true"
							data-testid="status-handle-{status.id}"
							onpointerdown={(event) => dragging.grab(event, status)}
							class="text-muted-foreground -ml-3 flex size-11 flex-none touch-none items-center justify-center"
						>
							<GripHorizontalIcon size={16} />
						</span>
						{@render swatch(status.color)}
						<span class="min-w-0 flex-1 truncate text-sm font-medium">{status.name}</span>
						{#if status.is_default}
							<span
								class="bg-muted text-muted-foreground flex-none rounded-full px-2 py-0.5 text-[10px]"
							>
								{m.status_default_badge()}
							</span>
						{/if}
						<Button
							variant="ghost"
							size="icon"
							aria-label={m.status_edit({ name: status.name })}
							onclick={() => open({ kind: 'edit', status })}
							class="text-muted-foreground size-11 flex-none"
						>
							<PencilIcon class="size-[15px]" aria-hidden="true" />
						</Button>
						{#if !status.is_default}
							<Button
								variant="ghost"
								size="icon"
								aria-label={m.status_delete({ name: status.name })}
								onclick={() => open({ kind: 'remove', status })}
								class="text-muted-foreground -mr-3 size-11 flex-none"
							>
								<TrashIcon class="size-[15px]" aria-hidden="true" />
							</Button>
						{:else}
							<span class="-mr-3 block size-11 flex-none"></span>
						{/if}
					</li>
				{/each}

				<li class="border-border/60 border-t">
					<button
						type="button"
						onclick={() => open({ kind: 'add', progress })}
						class="text-primary hover:bg-accent focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-[13px] font-semibold transition-colors outline-none focus-visible:ring-[3px]"
					>
						<PlusIcon size={15} aria-hidden="true" />
						{m.status_add()}
					</button>
				</li>
			</ul>
		</section>
	{/each}
</div>

{#if opened?.kind === 'add'}
	{@const progress = opened.progress}
	<Modal title={m.status_add()} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={(event) => add(event, progress)}>
			<div class="grid gap-2">
				<Label for="status-name">{m.status_name_label()}</Label>
				<Input id="status-name" bind:value={typed} />
			</div>
			<div class="grid gap-2">
				<Label for="status-color">{m.status_color_label()}</Label>
				<input
					id="status-color"
					type="color"
					bind:value={tinted}
					class="border-input h-11 w-20 rounded-md border bg-transparent p-1"
				/>
			</div>
			<Button type="submit" disabled={submission.busy || typed.trim().length === 0}>
				{m.add()}
			</Button>
		</form>
	</Modal>
{:else if opened?.kind === 'edit'}
	{@const status = opened.status}
	<Modal title={m.status_edit_title({ name: status.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={(event) => save(event, status)}>
			<div class="grid gap-2">
				<Label for="status-name">{m.status_name_label()}</Label>
				<Input id="status-name" bind:value={typed} />
			</div>
			<div class="grid gap-2">
				<Label for="status-color">{m.status_color_label()}</Label>
				<input
					id="status-color"
					type="color"
					bind:value={tinted}
					class="border-input h-11 w-20 rounded-md border bg-transparent p-1"
				/>
			</div>
			{@render section()}
			<Button type="submit" disabled={submission.busy || typed.trim().length === 0}>
				{m.save()}
			</Button>
		</form>
		{#if !status.is_default}
			<Button
				variant="outline"
				disabled={submission.busy}
				onclick={() => act(() => updateItemStatus(household, status.id, { is_default: true }))}
			>
				{m.status_make_default()}
			</Button>
		{/if}
	</Modal>
{:else if opened?.kind === 'remove'}
	{@const status = opened.status}
	<Modal title={m.status_delete_title({ name: status.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm" data-testid="status-fallout">
			{m.status_delete_explains()}
		</p>
		<Button
			variant="destructive"
			disabled={submission.busy}
			onclick={() => act(() => deleteItemStatus(household, status.id))}
		>
			{m.delete_it()}
		</Button>
	</Modal>
{/if}
