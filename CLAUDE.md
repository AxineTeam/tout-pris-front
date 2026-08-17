# tout-pris-front

Frontend SvelteKit du projet Tout Pris. Sois extrêmement concis.

## Langue

- Réponds en français sauf si le contexte est clairement anglophone
- Les messages de commit, noms de branches, code et commentaires dans le code restent en anglais

## Communication

- Soit brutalement honnête : si tu penses que j'ai tort dis-le moi !
- Pas de louanges inutiles ni de remplissage, réponses directes, pas de préambules
- Quand je pose une question réponds, ne fais pas de modifications, sauf si je l'ai explicitement demandé !
- Si tu rencontres une erreur que tu parviens à corriger sans comprendre pourquoi, documente-le !

## Stack

- SvelteKit 2, Svelte 5 en mode runes uniquement (`$state`, `$derived`, `$effect`, `$props` — forcé dans `vite.config.ts`), TypeScript strict
- SPA statique : `@sveltejs/adapter-static` avec `fallback: 'index.html'`, SSR désactivé globalement dans `src/routes/+layout.ts`
- Tailwind CSS v4 CSS-first (thème dans `src/app.css`, plugin `@tailwindcss/vite`), shadcn-svelte vendoré dans `src/lib/components/ui/`
- Node 22 LTS partout (`.nvmrc`, `engines` strict), dépendances npm (`package-lock.json`)
- Vitest + @testing-library/svelte en unitaire, Playwright en E2E contre le vrai backend, svelte-check + ESLint + Prettier en qualité
- Backend : [tout-pris-back](https://github.com/Haelle/tout-pris-back) (FastAPI), même origine via le reverse proxy nginx — le client API utilise le chemin relatif `/api`, proxy Vite vers `BACKEND_URL` en dev/preview, pas de CORS
- Docker + docker compose (front + back), devcontainer basé sur le service `front` ; `Dockerfile` prod multistage Node 22 → nginx:alpine, `Dockerfile.dev` avec Playwright/Chromium préinstallés dans `/opt/pw-browsers`

## Structure

- `src/routes/` : pages (`+page.svelte`), layout et désactivation SSR (`+layout.svelte`, `+layout.ts`)
- `src/lib/api.ts` : client HTTP typé du backend (types alignés sur son `openapi.json`)
- `src/lib/components/` : composants métier ; `src/lib/components/ui/` : shadcn-svelte vendoré (`npx shadcn-svelte@latest add <component>`, config dans `components.json`)
- `src/lib/utils.ts` : `cn()` et types utilitaires shadcn
- `src/app.css` : import Tailwind + thème (variables clair/sombre)
- Tests unitaires à côté du code (`*.svelte.test.ts` en jsdom — projet Vitest dans `vite.config.ts`), E2E dans `e2e/`
- `nginx/toutpris.conf` : conf de l'image de prod (fallback SPA)

## Commandes

- `make up` / `make down` : front dev + back via docker compose (ports 5173 / 8000)
- `make dev` : serveur Vite seul (back attendu sur :8000)
- `make check` : svelte-check
- `make lint` / `make fmt` : ESLint + Prettier (vérification / correction)
- `make test` : tests unitaires Vitest
- `make e2e` : Playwright — nécessite le back démarré
- `make build` / `make docker-build` : build SPA / image de prod

## Sans Docker (fallback)

- Si et seulement si tu ne peux pas démarrer de conteneur (déjà dans un conteneur, Docker indisponible), ignore les cibles Docker du Makefile et travaille en npm direct : `npm ci`, `npm run dev`, `npm run test:unit -- --run`, etc.
- Pour les E2E, démarre le back localement (`uv run uvicorn app.main:app` dans son dépôt) ; si le Chromium de Playwright n'est pas téléchargeable, pointe `PLAYWRIGHT_CHROMIUM_PATH` vers un Chromium système
- Dans tous les autres cas, passe par le Makefile

## Style de code

- Privilégie la simplicité et la lisibilité
- Pas de sur-ingénierie : résous le problème actuel, pas les problèmes hypothétiques
- Préfère les modifications minimales et ciblées
- Pas de commentaires : utilise des noms de variables/méthodes explicites et des messages de commit clairs à la place
- Ces principes s'appliquent à tout code produit : applicatif, scripts, configuration, infrastructure
- En markdown, pas de retour à la ligne dur — une ligne par paragraphe
- Runes uniquement : jamais de `export let`, stores ou syntaxe legacy Svelte 4 ; ne modifie pas les composants vendorés de `src/lib/components/ui/` sauf demande explicite
- `$effect` est une trappe de secours : pas d'effet pour dériver (`$derived`), pour réagir à une interaction (gestionnaire d'événement) ni pour charger des données au montage (appel direct dans le `<script>`, le SSR étant désactivé)
- `$state.raw` pour les données du backend : elles sont réassignées, jamais mutées — inutile de payer le proxy de réactivité profonde
- Liens internes via `resolve()` de `$app/paths`, jamais de `href` en dur : le front peut être servi sous un sous-chemin par le reverse proxy
- Blocs `{#each}` toujours keyés sur un identifiant stable, jamais l'index
- Avant de finaliser un composant, lance l'autofixer officiel : `npx @sveltejs/mcp svelte-autofixer <fichier>` (skill `svelte-code-writer`)

## Git

- Ne committe jamais sans demande explicite
- Ne committe jamais des fichiers que tu n'as ni écrits ni modifiés : c'est peut-être le travail d'un autre agent
- Titre de commit en anglais, au présent impératif ; le corps doit être assez explicite et détaillé pour comprendre le changement sans contexte
- Préfère les commits atomiques (un changement logique = un commit)
- Résous les conflits de PR par rebase sur `main`, jamais en mergeant `main` dans la branche : le repo merge en rebase-merge, qui jette les commits de merge et leurs résolutions (« Unable to merge » sinon)
- Quand le dev est fini, `git fetch origin main` et vérifie que la branche est rebasable sans conflit sur `main` ; si `main` a avancé, rebase et re-pousse avant de considérer la PR prête

## Tests

- Tests unitaires uniquement pour les composants (`*.svelte.test.ts`) ; tout le reste (client API, flux complets) est couvert en E2E
- Lance uniquement les tests pertinents, pas toute la suite
- Lance toute la suite (`make test`, et `make e2e` si le back est disponible) une fois que tu penses avoir fini
- Utilise la TDD quand c'est pertinent, demande si nécessaire
- Pas d'enregistrement HTTP : en E2E, toujours le vrai backend en service (image Docker `tout-pris-back:dev`, ou le tag x.y.z correspondant sur une release), jamais de mock ni de tapes
- Les E2E doivent nettoyer ce qu'ils créent (noms uniques, suppression en fin de test)

## Sécurité

- Ne committe jamais de secrets, tokens, ou mots de passe
- Vérifie les fichiers .env, credentials, clés privées avant tout staging

## Workflow

- Quand je te demande de traiter une issue ou une PR, souscris par défaut aux notifications de la PR concernée (`subscribe_pr_activity`) et suis-la jusqu'au merge
- Avant de démarrer le traitement d'une issue, si tu as des objections sur ce qui est demandé, commente-les sur l'issue et attends une réponse avant de commencer
- Lis toujours le code existant avant de proposer des modifications
- Utilise les outils dédiés (Read, Edit, Grep, Glob) plutôt que bash quand possible
- Après tout changement de code : `make check`, `make lint` puis `make test`
