<script lang="ts">
	import AccountScreen from '$lib/components/AccountScreen.svelte';
	import InvitationAcceptance from '$lib/components/InvitationAcceptance.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	let key = $derived(params.key);
</script>

<svelte:head><title>{m.title_invitation()}</title></svelte:head>

<AccountScreen title={m.invitation_title()} intro={m.invitation_intro()}>
	<InvitationAcceptance token={key} />
</AccountScreen>
