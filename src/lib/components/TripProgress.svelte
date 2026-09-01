<script lang="ts">
	import type { ProgressCategory, TripItem } from '$lib/api.js';
	import * as m from '$lib/paraglide/messages.js';

	let { lines }: { lines: TripItem[] } = $props();

	let segments = $derived<{ progress: ProgressCategory; token: string; count: number }[]>(
		(
			[
				['not_started', '--status-not-started'],
				['in_progress', '--status-in-progress'],
				['done', '--status-done']
			] as [ProgressCategory, string][]
		).map(([progress, token]) => ({
			progress,
			token,
			count: lines.filter((line) => line.status.progress === progress).length
		}))
	);
</script>

{#if lines.length > 0}
	<div
		role="img"
		aria-label={m.trip_progress({ done: segments[2].count, total: lines.length })}
		data-testid="trip-progress"
		class="bg-muted flex h-2 overflow-hidden rounded-full"
	>
		{#each segments as segment (segment.progress)}
			{#if segment.count > 0}
				<span
					data-testid="trip-bar-{segment.progress}"
					style:width="{(segment.count / lines.length) * 100}%"
					style:background-color="var({segment.token})"
				></span>
			{/if}
		{/each}
	</div>
{/if}
