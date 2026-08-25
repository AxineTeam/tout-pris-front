import { getHealth, type Health } from '$lib/api.js';

export const build = {
	version: __APP_VERSION__,
	commit: __APP_COMMIT__
};

let backend: Promise<Health> | null = null;

export function backendBuild(): Promise<Health> {
	backend ??= getHealth();
	return backend;
}
