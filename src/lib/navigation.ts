import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { households } from '$lib/households.svelte.js';

function localPath(candidate: string | null): string | null {
	if (!candidate) return null;
	if (!candidate.startsWith('/')) return null;
	if (candidate.startsWith('//') || candidate.startsWith('/\\')) return null;
	return candidate;
}

export async function homePath(): Promise<string> {
	await households.ensureLoaded();
	const landing = households.landing;
	return landing
		? resolve('/(app)/households/[id]/trips', { id: String(landing.id) })
		: resolve('/(app)/households/new');
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
