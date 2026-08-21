import type { AuthError } from '$lib/api.js';

export class Submission {
	errors = $state.raw<AuthError[]>([]);
	busy = $state(false);

	async run(action: () => Promise<AuthError[]>): Promise<void> {
		this.busy = true;
		try {
			this.errors = await action();
		} catch {
			this.errors = [{ message: 'Le backend est injoignable.', code: 'unreachable' }];
		} finally {
			this.busy = false;
		}
	}
}
