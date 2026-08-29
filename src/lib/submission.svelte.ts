import { ApiError, apiErrors, type AuthError } from '$lib/api.js';
import * as m from '$lib/paraglide/messages.js';

export class Submission {
	errors = $state.raw<AuthError[]>([]);
	busy = $state(false);

	async run(action: () => Promise<AuthError[]>): Promise<void> {
		this.busy = true;
		try {
			this.errors = await action();
		} catch (cause) {
			this.errors =
				cause instanceof ApiError
					? apiErrors(cause)
					: [{ message: m.api_unreachable(), code: 'unreachable' }];
		} finally {
			this.busy = false;
		}
	}
}
