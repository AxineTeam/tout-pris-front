import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

// En dev et en preview, /api est proxyfié vers le backend Django
// (tout-pris-back). En production le reverse proxy nginx joue ce rôle,
// le front et le back étant servis depuis la même origine (pas de CORS).
// Le préfixe /api n'est pas retiré : Django sert ses routes sous /api/, et
// l'en-tête Host n'est pas réécrit : Django compare l'Origin du navigateur à
// l'hôte de la requête pour le CSRF, comme nginx qui préserve le Host.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';

// Ref git et commit court de l'image, passés en argument de build par la CI.
// Rien ici ne peut les deviner : .dockerignore exclut .git et l'image de build
// n'a pas git, donc un `git rev-parse` retomberait silencieusement sur 'dev'
// dans toutes les images publiées. Même convention que le back, et mêmes noms.
const appVersion = process.env.APP_VERSION ?? 'dev';
const appCommit = process.env.APP_COMMIT ?? 'dev';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: 'index.html' }),
			// Le commit plutôt que l'horodatage de build par défaut : c'est ce que
			// compare `updated` de SvelteKit pour détecter une nouvelle version, et
			// il change à chaque build publié.
			version: { name: appCommit }
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(appVersion),
		__APP_COMMIT__: JSON.stringify(appCommit)
	},
	server: {
		proxy: {
			'/api': {
				target: backendUrl
			}
		}
	},
	// Tests unitaires réservés aux composants (*.svelte.test.ts) — tout le
	// reste est couvert en E2E par Playwright contre le vrai backend.
	test: {
		projects: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			}
		]
	}
});
