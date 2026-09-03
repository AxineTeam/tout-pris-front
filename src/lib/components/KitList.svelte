<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import FolderInputIcon from '@lucide/svelte/icons/folder-input';
	import GripHorizontalIcon from '@lucide/svelte/icons/grip-horizontal';
	import { resolve } from '$app/paths';
	import { createKit, updateKit, type Household, type Kit } from '$lib/api.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import KitCopy from '$lib/components/KitCopy.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Reordering } from '$lib/reorder.svelte.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		households,
		kits,
		onchanged
	}: { household: number; households: Household[]; kits: Kit[]; onchanged: () => void } = $props();

	const submission = new Submission();
	const dropping = new Submission();
	const dragging = new Reordering(() => kits);
	let adding = $state(false);
	let sending = $state.raw<{ kit: Kit; mode: 'copy' | 'move' } | null>(null);
	let named = $state('');
	let described = $state('');

	function open() {
		submission.errors = [];
		named = '';
		described = '';
		adding = true;
	}

	function drop() {
		const move = dragging.drop();
		if (!move || move.to === move.from) return;
		dropping.run(async () => {
			try {
				await updateKit(household, move.row.id, { position: move.to });
			} catch (refusal) {
				dragging.forget();
				await onchanged();
				throw refusal;
			}
			await onchanged();
			return [];
		});
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const name = named.trim();
		if (!name) return;
		submission.run(async () => {
			await createKit(household, name, described.trim());
			adding = false;
			await onchanged();
			return [];
		});
	}
</script>

<svelte:window
	onpointermove={(event) => dragging.drag(event)}
	onpointerup={drop}
	onpointercancel={() => dragging.cancel()}
/>

{#snippet entry(icon: LucideIcon, text: string, onclick: () => void)}
	{@const Icon = icon}
	<button
		type="button"
		role="menuitem"
		{onclick}
		class="hover:bg-accent focus-visible:ring-ring/50 active:bg-primary/25 flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]"
	>
		<Icon size={16} aria-hidden="true" class="flex-none" />
		{text}
	</button>
{/snippet}

{#if kits.length === 0}
	<p class="text-muted-foreground text-sm" data-testid="kits-empty">{m.kits_empty()}</p>
{/if}

<FormErrors errors={dropping.errors} />

<ul {@attach dragging.anchored} class={['grid min-w-0 gap-2', dragging.grabbed && 'select-none']}>
	{#each dragging.rows as kit (kit.id)}
		<li
			data-row={kit.id}
			style:transform={dragging.grabbed?.id === kit.id
				? `translateY(${dragging.offset}px)`
				: undefined}
			class={[
				'flex min-w-0 items-center',
				dragging.grabbed?.id === kit.id && 'relative z-10 drop-shadow-lg'
			]}
		>
			<span
				aria-hidden="true"
				data-testid="kit-handle-{kit.id}"
				onpointerdown={(event) => dragging.grab(event, kit)}
				class="text-muted-foreground -ml-2.5 flex size-11 flex-none touch-none items-center justify-center"
			>
				<GripHorizontalIcon size={16} />
			</span>
			<RowCard
				href={resolve('/(app)/households/[id]/kits/[kit]', {
					id: String(household),
					kit: String(kit.id)
				})}
				data-testid="kit-{kit.id}"
				class={dragging.grabbed?.id === kit.id ? 'bg-accent' : undefined}
			>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold">{kit.name}</span>
					{#if kit.description}
						<span class="text-muted-foreground block truncate text-xs">{kit.description}</span>
					{/if}
				</span>

				{#snippet actions()}
					<Menu
						label={m.kit_actions({ name: kit.name })}
						align="right"
						triggerClass="text-muted-foreground relative z-10 -my-1 flex size-11 flex-none items-center justify-center"
					>
						{#snippet trigger()}
							<EllipsisIcon size={18} aria-hidden="true" />
						{/snippet}

						{#snippet children(close: () => void)}
							{@render entry(CopyIcon, m.kit_copy(), () => {
								close();
								sending = { kit, mode: 'copy' };
							})}
							{@render entry(FolderInputIcon, m.kit_move(), () => {
								close();
								sending = { kit, mode: 'move' };
							})}
						{/snippet}
					</Menu>
					<ChevronRightIcon size={16} aria-hidden="true" class="text-muted-foreground flex-none" />
				{/snippet}
			</RowCard>
		</li>
	{/each}
	<li class="pl-8.5">
		<AddCard label={m.kit_new()} onclick={open} />
	</li>
</ul>

{#if sending}
	<KitCopy
		{household}
		{households}
		kit={sending.kit}
		mode={sending.mode}
		onmoved={onchanged}
		onclose={() => (sending = null)}
	/>
{/if}

{#if adding}
	<Modal title={m.kit_new()} onclose={() => (adding = false)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={add}>
			<div class="grid gap-2">
				<Label for="kit-name">{m.kit_name_label()}</Label>
				<Input id="kit-name" bind:value={named} />
			</div>
			<div class="grid gap-2">
				<Label for="kit-description">{m.kit_description_label()}</Label>
				<Input id="kit-description" bind:value={described} />
			</div>
			<Button type="submit" disabled={submission.busy || named.trim().length === 0}>
				{m.create()}
			</Button>
		</form>
	</Modal>
{/if}
