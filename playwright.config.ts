import { defineConfig } from '@playwright/test';

// Les tests E2E tournent contre la vraie API (pas d'enregistrement HTTP) :
// elle doit écouter sur API_URL (http://localhost:8000 par défaut) —
// `vite preview` proxyfie /api vers elle, comme nginx en production.

// PLAYWRIGHT_CHROMIUM_PATH : chemin d'un Chromium système à utiliser à la
// place du navigateur téléchargé par `playwright install` (environnements
// où le téléchargement est indisponible).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: BASE_URL,
		locale: 'fr-FR',
		...(executablePath ? { launchOptions: { executablePath } } : {})
	},
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
