import { goto } from '$app/navigation';

function localPath(candidate: string | null): string | null {
	if (!candidate) return null;
	if (!candidate.startsWith('/')) return null;
	if (candidate.startsWith('//') || candidate.startsWith('/\\')) return null;
	return candidate;
}

export function returnTo(next: string | null, fallback: string): Promise<void> {
	return goto(localPath(next) ?? fallback);
}
