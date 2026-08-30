<script lang="ts">
	import type { Snippet } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let {
		title,
		description,
		onclose,
		children
	}: {
		title: string;
		description?: string;
		onclose: () => void;
		children: Snippet;
	} = $props();

	let content = $state.raw<HTMLElement | null>(null);

	function focusFirstField(event: Event) {
		const field = content?.querySelector<HTMLElement>('input, textarea, select');
		if (!field) return;
		event.preventDefault();
		field.focus();
	}
</script>

<Dialog.Root open onOpenChange={(open) => !open && onclose()}>
	<Dialog.Content
		bind:ref={content}
		onOpenAutoFocus={focusFirstField}
		showCloseButton={false}
		class="bg-card text-card-foreground top-auto bottom-0 max-h-[85dvh] max-w-none translate-y-0 overflow-y-auto rounded-t-xl rounded-b-none p-5 sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-y-1/2 sm:rounded-xl"
	>
		<Dialog.Header class="flex-row items-start gap-3">
			<div class="min-w-0 flex-1">
				<Dialog.Title class="text-base leading-tight font-semibold">{title}</Dialog.Title>
				{#if description}
					<Dialog.Description class="mt-1 wrap-anywhere">{description}</Dialog.Description>
				{/if}
			</div>
			<Dialog.Close aria-label={m.close()}>
				{#snippet child({ props })}
					<Button
						variant="ghost"
						size="icon"
						class="text-muted-foreground -m-2 size-11 flex-none"
						{...props}
					>
						<XIcon class="size-[18px]" aria-hidden="true" />
					</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Header>
		{@render children()}
	</Dialog.Content>
</Dialog.Root>
