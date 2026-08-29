<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import BackpackIcon from '@lucide/svelte/icons/backpack';
	import CircleUserIcon from '@lucide/svelte/icons/circle-user';
	import PlaneTakeoffIcon from '@lucide/svelte/icons/plane-takeoff';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';

	interface Tab {
		name: string;
		label: string;
		icon: LucideIcon;
		href: string | undefined;
	}

	let { household }: { household: number | undefined } = $props();

	let id = $derived(household === undefined ? undefined : String(household));

	let tabs = $derived<Tab[]>([
		{
			name: 'trips',
			label: m.nav_trips(),
			icon: PlaneTakeoffIcon,
			href: id ? resolve('/(app)/households/[id]/trips', { id }) : undefined
		},
		{
			name: 'kits',
			label: m.nav_kits(),
			icon: BackpackIcon,
			href: id ? resolve('/(app)/households/[id]/kits', { id }) : undefined
		},
		{
			name: 'household',
			label: m.nav_household(),
			icon: UsersIcon,
			href: id ? resolve('/(app)/households/[id]', { id }) : resolve('/(app)/households/new')
		},
		{ name: 'me', label: m.nav_me(), icon: CircleUserIcon, href: resolve('/(app)/me') }
	]);

	function reach(pathname: string, href: string | undefined): number {
		if (href === undefined) return 0;
		return pathname === href || pathname.startsWith(`${href}/`) ? href.length : 0;
	}

	let active = $derived(
		tabs.reduce(
			(best, tab) => {
				const depth = reach(page.url.pathname, tab.href);
				return depth > best.depth ? { name: tab.name, depth } : best;
			},
			{ name: '', depth: 0 }
		).name
	);
</script>

{#snippet face(tab: Tab)}
	<tab.icon size={20} aria-hidden="true" />
	<span class="truncate">{tab.label}</span>
{/snippet}

<nav
	aria-label={m.nav_label()}
	class="bg-card border-border flex-none border-t pb-[env(safe-area-inset-bottom)]"
>
	<ul class="mx-auto flex w-full max-w-3xl">
		{#each tabs as tab (tab.name)}
			<li class="flex-1">
				{#if tab.href}
					<a
						href={tab.href}
						aria-current={tab.name === active ? 'page' : undefined}
						class="text-muted-foreground aria-[current=page]:text-primary flex h-16 min-h-11 flex-col items-center justify-center gap-1 px-1 text-xs font-medium"
					>
						{@render face(tab)}
					</a>
				{:else}
					<span
						aria-disabled="true"
						class="text-muted-foreground/40 flex h-16 min-h-11 flex-col items-center justify-center gap-1 px-1 text-xs font-medium"
					>
						{@render face(tab)}
					</span>
				{/if}
			</li>
		{/each}
	</ul>
</nav>
