import { getHealth, type Health } from '$lib/api.js';

export const build = {
	version: __APP_VERSION__,
	commit: __APP_COMMIT__
};

let api: Promise<Health> | null = null;

export function apiBuild(): Promise<Health> {
	api ??= getHealth();
	return api;
}
