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
- Vitest + @testing-library/svelte en unitaire, Playwright en E2E contre la vraie API, svelte-check + ESLint + Prettier en qualité
- API : [tout-pris-api](https://github.com/AxineTeam/tout-pris-api) (Django + DRF + django-allauth headless), même origine via le reverse proxy nginx — le client API utilise le chemin relatif `/api`, proxy Vite vers `API_URL` en dev/preview sans réécriture de chemin, pas de CORS
- Docker + docker compose (front + API), devcontainer basé sur le service `front` ; `Dockerfile` prod multistage Node 22 → nginx:alpine, `Dockerfile.dev` avec Playwright/Chromium préinstallés dans `/opt/pw-browsers`

## Skills

- Les skills du dépôt sont dans `.claude/skills/` et sont à utiliser, pas seulement à lister
- `svelte-code-writer` et `svelte-core-bestpractices` (officiels, [sveltejs/ai-tools](https://github.com/sveltejs/ai-tools)) : à charger avant toute création, modification ou analyse d'un `.svelte` / `.svelte.ts` — relire une PR est une analyse — et à suivre en entier, les instructions et exemples du skill, pas seulement l'autofixer
- `code-reviewer`, `debugging-wizard`, `security-reviewer`, `test-master`, `typescript-pro` : mêmes skills génériques que l'API
- Ne compte pas sur le chargement automatique : Claude Code ne charge un skill que si sa `description` accroche la tâche, et « relis cette PR » n'accroche rien — charge-les explicitement en début de tâche, avant de lire le diff
- Relire une PR, c'est charger `code-reviewer`, plus les skills Svelte dès que le diff touche un `.svelte` / `.svelte.ts`, plus `security-reviewer` s'il touche l'authentification, les cookies ou les entrées utilisateur
- Un hook `SessionStart` (`.claude/hooks/session-start.sh`) installe la toolchain dans les sessions Claude Code web

## Structure

- `src/routes/` : pages (`+page.svelte`), layout et désactivation SSR (`+layout.svelte`, `+layout.ts`)
- `src/lib/api.ts` : client HTTP typé de l'API — types alignés sur son `openapi.yaml` pour le domaine et sur la spec servie par allauth sur `/api/auth/openapi.yaml` pour l'authentification ; porte le cookie de session et le jeton CSRF
- `src/lib/components/` : composants métier ; `src/lib/components/ui/` : shadcn-svelte vendoré (`npx shadcn-svelte@latest add <component>`, config dans `components.json`)
- `src/lib/build.ts` : ref git et commit de l'image, injectés au build par `vite.config.ts` (`APP_VERSION`/`APP_COMMIT`), et lecture du build de l'API via `/api/health/` — `.git` n'étant pas dans le contexte de build, **rien dans le code ne peut ni ne doit interroger git**
- `src/lib/utils.ts` : `cn()` et types utilitaires shadcn
- `src/app.css` : import Tailwind + thème (variables clair/sombre)
- Tests unitaires à côté du code (`*.svelte.test.ts` en jsdom — projet Vitest dans `vite.config.ts`), E2E dans `e2e/`
- `nginx/toutpris.conf` : conf de l'image de prod (fallback SPA)

## Commandes

- `make up` / `make down` : front dev + API via docker compose (ports 5173 / 8000)
- `make dev` : serveur Vite seul (API attendue sur :8000)
- `make check` : svelte-check
- `make lint` / `make fmt` : ESLint + Prettier (vérification / correction)
- `make test` : tests unitaires Vitest
- `make e2e` : Playwright — nécessite l'API démarrée
- `make build` / `make docker-build` : build SPA / image de prod

## Sans Docker (fallback)

- Si et seulement si tu ne peux pas démarrer de conteneur (déjà dans un conteneur, Docker indisponible), ignore les cibles Docker du Makefile et travaille en npm direct : `npm ci`, `npm run dev`, `npm run test:unit -- --run`, etc.
- Pour les E2E, démarre l'API localement (`uv run uvicorn app.main:app` dans son dépôt) ; si le Chromium de Playwright n'est pas téléchargeable, pointe `PLAYWRIGHT_CHROMIUM_PATH` vers un Chromium système
- Dans tous les autres cas, passe par le Makefile

## Style de code

- Privilégie la simplicité et la lisibilité
- Pas de sur-ingénierie : résous le problème actuel, pas les problèmes hypothétiques
- Préfère les modifications minimales et ciblées
- Pas de commentaires : utilise des noms de variables/méthodes explicites et des messages de commit clairs à la place
- Ces principes s'appliquent à tout code produit : applicatif, scripts, configuration, infrastructure
- En markdown, pas de retour à la ligne dur — une ligne par paragraphe
- Runes uniquement : jamais de `export let`, stores ou syntaxe legacy Svelte 4 ; ne modifie pas les composants vendorés de `src/lib/components/ui/` sauf demande explicite
- Personnalise-les par leur prop `class` plutôt qu'en éditant le fichier : `cn()` fait tourner `tailwind-merge`, donc une classe passée à l'appel remplace celle du composant au lieu de s'y ajouter. Le fichier vendoré reste régénérable
- `$effect` est une trappe de secours : pas d'effet pour dériver (`$derived`), pour réagir à une interaction (gestionnaire d'événement) ni pour charger des données au montage (appel direct dans le `<script>`, le SSR étant désactivé)
- `$state.raw` pour les données de l'API : elles sont réassignées, jamais mutées — inutile de payer le proxy de réactivité profonde
- Liens internes via `resolve()` de `$app/paths`, jamais de `href` en dur : le front peut être servi sous un sous-chemin par le reverse proxy
- Blocs `{#each}` toujours keyés sur un identifiant stable, jamais l'index
- Aucun texte visible en dur dans un composant : tout passe par `m.*()`, avec la clé ajoutée dans `messages/fr.json` **et** `messages/en.json`
- Avant de finaliser un composant, lance l'autofixer officiel : `npx @sveltejs/mcp svelte-autofixer <fichier>` (skill `svelte-code-writer`)
- La couleur porte de l'information : un état, une échéance, un élément actif. Pas de couleur décorative — ni filet d'accent en haut des cartes, ni dégradé. Un écran qui n'a rien à distinguer reste en encre sur papier
- L'indigo (`primary`) marque l'action et l'état courant. Le vermillon (`destructive`) est réservé au danger et ne sert jamais d'accent

## Écriture

Ces règles valent pour les issues, les descriptions de PR, les revues et les commentaires.

- Une phrase qui ne change rien pour le lecteur ne s'écrit pas : pas de résumé de ce qui précède, pas de constat que tout va bien, pas de transition
- Pas de section « Vérifié » : la CI dit ce qui passe et le relecteur la lit. Recopier ses sorties ne prouve rien de plus et enterre ce que la PR a à dire
- Ne décris pas ce que couvrent les tests, le fichier de tests est là pour ça
- Une revue liste des constats actionnables. Ce qui est correct ne se commente pas, le silence suffit à le dire
- Un constat tient en une affirmation et sa conséquence. Le raisonnement qui y mène ne s'écrit que s'il est contestable

## Issues

- Une issue se lit à deux : le product owner d'abord, le lead technique ensuite. Elle est donc écrite en deux temps, dans cet ordre, et chacun doit pouvoir répondre à sa question sans lire l'autre moitié
- **La moitié fonctionnelle répond au product owner : l'équipe a-t-elle compris le besoin ?** Elle commence par ce que quelqu'un cherche à faire et par ce qui l'en empêche aujourd'hui, puis déroule le parcours — qui fait quoi, dans quel ordre, ce qu'il voit — avec des prénoms et des écrans réels. Le test E2E est ce parcours transcrit : écrit assez concrètement, il n'y a pas de troisième texte à produire, et les trois tiennent dans le même bloc de prose plutôt que dans trois sections
- Elle se valide sans connaître le code. Si comprendre le besoin demande un nom de table, une route ou un composant, elle a manqué son lecteur
- **La moitié technique répond au lead : est-ce que ça tient dans le cadre existant ?** Elle dit comment, jamais pourquoi, et se rattache à ce qui est déjà là — la convention suivie, le motif repris, l'endroit du code qui résout déjà le même problème. Une solution décrite hors-sol ne se valide pas, elle se croit sur parole
- Ce qu'elle contient doit se rattacher à une ligne du bloc fonctionnel. Ce qui ne s'y rattache pas est du périmètre qui s'invite
- Une issue sans effet visible pour un utilisateur — un renommage, une règle d'outillage, une montée de version — le dit en une phrase et passe directement à la technique. Ne lui invente pas un besoin qu'elle n'a pas

## Git

- Ne committe jamais sans demande explicite
- Ne committe jamais des fichiers que tu n'as ni écrits ni modifiés : c'est peut-être le travail d'un autre agent
- Titre de commit en anglais, au présent impératif ; le corps doit être assez explicite et détaillé pour comprendre le changement sans contexte
- Préfère les commits atomiques (un changement logique = un commit)
- L'historique qui arrive sur `main` est celui de la bonne version, pas celui des allers-retours. Le dépôt merge en rebase-merge : les commits de la branche atterrissent tels quels, donc ils doivent déjà être propres
- Avant de déclarer la PR prête, réécris **ta** branche pour qu'aucun de ses commits n'en corrige un autre. Pendant l'itération, `git commit --fixup=<sha>` ; à la fin, `git rebase --autosquash origin/main` — `rebase -i` n'est pas disponible en session agent, `GIT_SEQUENCE_EDITOR=true` le remplace
- Vérifie que la réécriture n'a rien perdu : `git diff <ancienne-tête> HEAD` doit être vide. Un rebase qui traverse un conflit supprime un morceau sans le dire, et c'est la seule preuve qui vaille — ne pousse pas avant de l'avoir lue
- Pousse la réécriture avec `--force-with-lease`, jamais `--force` : il refuse si la branche a bougé entre-temps
- Le message décrit le code tel qu'il arrive, pas le chemin parcouru : jamais de « la première version faisait X, corrigé en `abc1234` ». L'hésitation appartient à la PR, pas à `main`
- Ne réécris qu'une fois les revues abouties : une réécriture en cours de revue fait perdre au relecteur son point de comparaison
- Résous les conflits de PR par rebase sur `main`, jamais en mergeant `main` dans la branche : le repo merge en rebase-merge, qui jette les commits de merge et leurs résolutions (« Unable to merge » sinon)
- Quand le dev est fini, `git fetch origin main` et vérifie que la branche est rebasable sans conflit sur `main` ; si `main` a avancé, rebase et re-pousse avant de considérer la PR prête

## Tests

- Tests unitaires uniquement pour les composants (`*.svelte.test.ts`) ; tout le reste (client API, flux complets) est couvert en E2E
- Lance uniquement les tests pertinents, pas toute la suite
- Lance toute la suite (`make test`, et `make e2e` si l'API est disponible) une fois que tu penses avoir fini
- Utilise la TDD quand c'est pertinent, demande si nécessaire
- Pas d'enregistrement HTTP : en E2E, toujours la vraie API en service (image Docker `tout-pris-api:dev`, ou le tag x.y.z correspondant sur une release), jamais de mock ni de tapes
- Les E2E doivent nettoyer ce qu'ils créent (noms uniques, suppression en fin de test)

## Sécurité

- Ne committe jamais de secrets, tokens, ou mots de passe
- Vérifie les fichiers .env, credentials, clés privées avant tout staging

## Workflow

- Quand je te demande de traiter une issue ou une PR, souscris par défaut aux notifications de la PR concernée (`subscribe_pr_activity`) et suis-la jusqu'au merge
- Les notifications sont un déclencheur commode, jamais une source de vérité : leur silence ne prouve rien. Sur une PR suivie, lis les commentaires (`get_comments`) en partant du plus récent — c'est là qu'arrive le retour, et des revues vides (`get_reviews`, fils de revue inline) ne veulent pas dire qu'il n'y a rien de neuf
- Après tout merge ou fermeture de PR, réabonne-toi aux PR encore ouvertes : le désabonnement automatique peut emporter leurs abonnements sans rien signaler
- Avant de démarrer le traitement d'une issue, si tu as des objections sur ce qui est demandé, commente-les sur l'issue et attends une réponse avant de commencer
- Lis toujours le code existant avant de proposer des modifications
- Utilise les outils dédiés (Read, Edit, Grep, Glob) plutôt que bash quand possible
- Après tout changement de code : `make check`, `make lint` puis `make test`
