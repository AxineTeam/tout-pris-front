import { redirect } from '@sveltejs/kit';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { session } from '$lib/session.svelte.js';

function localPath(candidate: string | null): string | null {
	if (!candidate) return null;
	if (!candidate.startsWith('/')) return null;
	if (candidate.startsWith('//') || candidate.startsWith('/\\')) return null;
	return candidate;
}

export function returnTo(next: string | null, fallback: string): Promise<void> {
	return goto(localPath(next) ?? fallback);
}

export function loginPath(next: string): string {
	return `${resolve('/account/login')}?next=${encodeURIComponent(next)}`;
}

export function goToLogin(next: string): Promise<void> {
	return goto(loginPath(next));
}

export async function redirectWhenAuthenticated({ url }: { url: URL }): Promise<void> {
	await session.ensureLoaded();
	if (session.authenticated) redirect(307, localPath(url.searchParams.get('next')) ?? resolve('/'));
}
