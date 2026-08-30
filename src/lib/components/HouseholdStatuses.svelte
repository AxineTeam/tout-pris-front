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
	import { suggestedColor } from '$lib/statuses.js';
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
	let container = $state.raw<HTMLElement>();
	let grabbed = $state.raw<ItemStatus | null>(null);
	let arrangement = $state.raw<ItemStatus[] | null>(null);
	let arrangedFrom = $state.raw<ItemStatus[] | null>(null);

	let groups = $derived<{ progress: ProgressCategory; title: string; counts: string }[]>([
		{
			progress: 'not_started',
			title: m.progress_not_started(),
			counts: m.progress_not_started_counts()
		},
		{
			progress: 'in_progress',
			title: m.progress_in_progress(),
			counts: m.progress_in_progress_counts()
		},
		{ progress: 'done', title: m.progress_done(), counts: m.progress_done_counts() }
	]);

	let rows = $derived(arrangement && statuses === arrangedFrom ? arrangement : statuses);

	function of(progress: ProgressCategory): ItemStatus[] {
		return rows.filter((status) => status.progress === progress);
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

	function held(node: HTMLElement) {
		container = node;
	}

	function boxOf(selector: string): DOMRect | undefined {
		return container?.querySelector(selector)?.getBoundingClientRect();
	}

	function sectionUnder(y: number): ProgressCategory {
		let nearest = groups[0].progress;
		let shortest = Infinity;
		for (const group of groups) {
			const box = boxOf(`[data-testid="status-group-${group.progress}"]`);
			if (!box) continue;
			if (y >= box.top && y <= box.bottom) return group.progress;
			const gap = y < box.top ? box.top - y : y - box.bottom;
			if (gap < shortest) {
				shortest = gap;
				nearest = group.progress;
			}
		}
		return nearest;
	}

	function passed(status: ItemStatus, y: number): boolean {
		const box = boxOf(`[data-status="${status.id}"]`);
		return box !== undefined && box.top + box.height / 2 < y;
	}

	function landing(moved: ItemStatus, y: number): ItemStatus[] {
		const progress = sectionUnder(y);
		const rest = rows.filter((status) => status.id !== moved.id);
		const section = rest.filter((status) => status.progress === progress);
		const above = section.filter((status) => passed(status, y)).length;
		const at =
			above < section.length
				? rest.indexOf(section[above])
				: section.length > 0
					? rest.indexOf(section[above - 1]) + 1
					: rest.length;
		return [...rest.slice(0, at), { ...moved, progress }, ...rest.slice(at)];
	}

	function grab(event: PointerEvent, status: ItemStatus) {
		if (!container || rows.length < 2) return;
		const start = [...rows];
		container.setPointerCapture(event.pointerId);
		grabbed = status;
		arrangedFrom = statuses;
		arrangement = start;
	}

	function drag(event: PointerEvent) {
		if (grabbed) arrangement = landing(grabbed, event.clientY);
	}

	function letGo() {
		grabbed = null;
		arrangement = null;
	}

	function drop() {
		const moved = grabbed;
		const next = arrangement;
		grabbed = null;
		if (!moved || !next) return;
		const position = next.findIndex((status) => status.id === moved.id);
		const progress = next[position].progress;
		const before = statuses.findIndex((status) => status.id === moved.id);
		if (progress === moved.progress && position === before) {
			arrangement = null;
			return;
		}
		dropping.run(async () => {
			try {
				await updateItemStatus(household, moved.id, { progress, position });
			} catch (refusal) {
				arrangement = null;
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
			{#each groups as group (group.progress)}
				<option value={group.progress}>{group.title}</option>
			{/each}
		</select>
	</div>
{/snippet}

<svelte:window onpointermove={drag} onpointerup={drop} onpointercancel={letGo} />

<div {@attach held} class="grid gap-4">
	<p class="bg-muted text-muted-foreground rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed">
		{m.statuses_intro()}
	</p>

	<FormErrors errors={dropping.errors} />

	{#each groups as group (group.progress)}
		<section
			class="border-border bg-card grid gap-1.5 rounded-xl border px-3 pt-3 pb-1"
			data-testid="status-group-{group.progress}"
		>
			<div class="flex items-baseline gap-2">
				<h2 class="text-sm font-semibold">{group.title}</h2>
				<span class="text-muted-foreground text-[11.5px]">{group.counts}</span>
			</div>

			<ul class="grid min-w-0">
				{#each of(group.progress) as status (status.id)}
					<li
						data-status={status.id}
						class={[
							'border-border/60 flex min-h-11 min-w-0 items-center gap-1.5 border-t',
							grabbed?.id === status.id && 'bg-accent'
						]}
					>
						<span
							aria-hidden="true"
							data-testid="status-handle-{status.id}"
							onpointerdown={(event) => grab(event, status)}
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
						onclick={() => open({ kind: 'add', progress: group.progress })}
						class="text-primary flex min-h-11 w-full items-center gap-2 text-left text-[13px] font-semibold"
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
