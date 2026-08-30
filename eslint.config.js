import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		// Composants shadcn vendorés : le href est un prop générique passé par
		// l'appelant, c'est à lui de le résoudre.
		files: ['src/lib/components/ui/**'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// La destination d'après connexion est un chemin calculé à l'exécution,
		// déjà validé comme local ici : resolve() ne prend que des ids de route.
		files: ['src/lib/navigation.ts'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// Already resolved paths: a computed tab href, a caller's prop.
		files: [
			'src/lib/components/BottomNav.svelte',
			'src/lib/components/RowCard.svelte',
			'src/lib/components/ScreenHeader.svelte'
		],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		// Global declarations
		files: ['src/app.d.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off'
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'node_modules/',
			'project.inlang/',
			'src/lib/paraglide/',
			'test-results/',
			'playwright-report/'
		]
	}
);
