<script lang="ts">
	const tints = ['bg-avatar-1', 'bg-avatar-2', 'bg-avatar-3', 'bg-avatar-4', 'bg-avatar-5'];

	let { id, name, small = false }: { id: number; name: string; small?: boolean } = $props();

	let tint = $derived(tints[id % tints.length]);
	let initial = $derived([...name.trim()][0]?.toUpperCase() ?? '?');
</script>

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
