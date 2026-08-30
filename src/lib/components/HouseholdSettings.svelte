<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { resolve } from '$app/paths';
	import { deleteHousehold, renameHousehold, type Household, type ItemStatus } from '$lib/api.js';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { households, leaveBehind } from '$lib/households.svelte.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let {
		household,
		statuses,
		owner,
		onchanged
	}: {
		household: Household;
		statuses: ItemStatus[];
		owner: boolean;
		onchanged: () => void;
	} = $props();

	const submission = new Submission();
	let opened = $state.raw<'rename' | 'dissolve' | null>(null);
	let typed = $state('');

	function open(next: 'rename' | 'dissolve') {
		submission.errors = [];
		typed = household.name;
		opened = next;
	}

	function rename(event: SubmitEvent) {
		event.preventDefault();
		const name = typed.trim();
		if (!name) return;
		submission.run(async () => {
			households.replace(await renameHousehold(household.id, name));
			opened = null;
			onchanged();
			return [];
		});
	}

	function dissolve() {
		submission.run(async () => {
			await deleteHousehold(household.id);
			opened = null;
			await leaveBehind(household.id);
			return [];
		});
	}
</script>

<section class="grid gap-3">
	<h2 class="text-muted-foreground text-xs font-semibold tracking-[0.08em] uppercase">
		{m.household_settings()}
	</h2>

	<ul class="grid gap-2">
		<li>
			<a
				href={resolve('/(app)/households/[id]/statuses', { id: String(household.id) })}
				data-testid="statuses"
				class="border-border bg-card flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
			>
				<span aria-hidden="true" class="flex flex-none gap-[3px]">
					{#each statuses.slice(0, 3) as status (status.id)}
						<span class="size-[9px] rounded-full" style:background-color={status.color}></span>
					{/each}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold">{m.statuses_title()}</span>
					<span class="text-muted-foreground block truncate text-xs">{m.statuses_manage()}</span>
				</span>
				<ChevronRightIcon size={16} aria-hidden="true" class="text-muted-foreground flex-none" />
			</a>
		</li>
		{#if owner}
			<li>
				<button
					type="button"
					onclick={() => open('rename')}
					class="border-border bg-card flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold"
				>
					{m.household_rename()}
				</button>
			</li>
			<li>
				<button
					type="button"
					onclick={() => open('dissolve')}
					class="border-destructive/40 bg-card text-destructive flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold"
				>
					{m.household_delete()}
				</button>
			</li>
		{/if}
	</ul>
</section>

{#if opened === 'rename'}
	<Modal title={m.household_rename()} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<form class="grid gap-4" onsubmit={rename}>
			<div class="grid gap-2">
				<Label for="household-name">{m.household_name_label()}</Label>
				<Input id="household-name" bind:value={typed} />
			</div>
			<Button type="submit" disabled={submission.busy || typed.trim().length === 0}>
				{m.rename()}
			</Button>
		</form>
	</Modal>
{:else if opened === 'dissolve'}
	<Modal title={m.household_delete_title({ name: household.name })} onclose={() => (opened = null)}>
		<FormErrors errors={submission.errors} />
		<p class="text-muted-foreground text-sm">{m.household_delete_explains()}</p>
		<Button variant="destructive" disabled={submission.busy} onclick={dissolve}>
			{m.household_delete()}
		</Button>
	</Modal>
{/if}
