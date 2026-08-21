import { invalidateAll } from '$app/navigation';
import {
	logIn,
	logOut,
	readSession,
	signUp,
	verifyEmail,
	type AuthResponse,
	type AuthUser
} from '$lib/api.js';

class Session {
	user = $state.raw<AuthUser | null>(null);
	#loading: Promise<void> | null = null;

	get authenticated(): boolean {
		return this.user !== null;
	}

	ensureLoaded(): Promise<void> {
		this.#loading ??= readSession()
			.then((response) => {
				this.#apply(response);
			})
			.catch((error) => {
				this.#loading = null;
				throw error;
			});
		return this.#loading;
	}

	async logIn(email: string, password: string): Promise<AuthResponse> {
		return this.#apply(await logIn(email, password));
	}

	async signUp(email: string, password: string): Promise<AuthResponse> {
		return this.#apply(await signUp(email, password));
	}

	async verifyEmail(key: string): Promise<AuthResponse> {
		return this.#apply(await verifyEmail(key));
	}

	async logOut(): Promise<void> {
		this.#apply(await logOut());
	}

	expire(): void {
		this.user = null;
		invalidateAll();
	}

	#apply(response: AuthResponse): AuthResponse {
		this.user = response.meta?.is_authenticated ? (response.data?.user ?? null) : null;
		return response;
	}
}

export const session = new Session();

export function verificationPending(response: AuthResponse): boolean {
	return (response.data?.flows ?? []).some((flow) => flow.id === 'verify_email' && flow.is_pending);
}
