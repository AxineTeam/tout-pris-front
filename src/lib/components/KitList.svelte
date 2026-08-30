<script lang="ts">
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { resolve } from '$app/paths';
	import { createKit, type Kit } from '$lib/api.js';
	import AddCard from '$lib/components/AddCard.svelte';
	import FormErrors from '$lib/components/FormErrors.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import RowCard from '$lib/components/RowCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as m from '$lib/paraglide/messages.js';
	import { Submission } from '$lib/submission.svelte.js';

	let { household, kits, onchanged }: { household: number; kits: Kit[]; onchanged: () => void } =
		$props();

	const submission = new Submission();
	let adding = $state(false);
	let named = $state('');
	let described = $state('');

	function open() {
		submission.errors = [];
		named = '';
		described = '';
		adding = true;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const name = named.trim();
		if (!name) return;
		submission.run(async () => {
			await createKit(household, name, described.trim());
			adding = false;
			onchanged();
			return [];
		});
	}
</script>

{#if kits.length === 0}
	<p class="text-muted-foreground text-sm" data-testid="kits-empty">{m.kits_empty()}</p>
{/if}

<ul class="grid min-w-0 gap-2">
	{#each kits as kit (kit.id)}
		<li>
			<RowCard
				href={resolve('/(app)/households/[id]/kits/[kit]', {
					id: String(household),
					kit: String(kit.id)
				})}
				data-testid="kit-{kit.id}"
			>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold">{kit.name}</span>
					{#if kit.description}
						<span class="text-muted-foreground block truncate text-xs">{kit.description}</span>
					{/if}
				</span>
				<ChevronRightIcon size={16} aria-hidden="true" class="text-muted-foreground flex-none" />
			</RowCard>
		</li>
	{/each}
	<li>
		<AddCard label={m.kit_new()} onclick={open} />
	</li>
</ul>

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
