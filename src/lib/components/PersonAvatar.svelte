<script lang="ts">
	import type { Person } from '$lib/api.js';

	const tints = ['bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4', 'bg-avatar-5'];

	let { person, small = false }: { person: Person | null; small?: boolean } = $props();

	let tint = $derived(person ? tints[person.id % tints.length] : 'bg-muted-foreground');
	let initial = $derived(person ? ([...person.name.trim()][0]?.toUpperCase() ?? '?') : '∗');
</script>

<!-- The name is always written beside it, which is why the circle stays decorative. -->
<span
	aria-hidden="true"
	class={[
		'text-avatar-foreground flex flex-none items-center justify-center rounded-full font-semibold',
		tint,
		small ? 'size-7 text-xs' : 'size-9 text-sm'
	]}
>
	{initial}
</span>
