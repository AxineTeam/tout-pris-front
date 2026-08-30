# tout-pris-front

Frontend SvelteKit for Tout Pris — SPA statique servie par nginx, consommant l'API
[tout-pris-api](https://github.com/AxineTeam/tout-pris-api) (Django + DRF).

## Stack

| Couche          | Choix                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Framework       | SvelteKit 2.x                                                           |
| Composants      | Svelte 5 — runes uniquement (`$state`, `$derived`, `$effect`, `$props`) |
| Adapter         | `@sveltejs/adapter-static`, `fallback: 'index.html'`                    |
| Rendu           | SPA, SSR désactivé globalement                                          |
| CSS             | Tailwind CSS v4 (configuration CSS-first, plugin Vite)                  |
| UI              | shadcn-svelte (composants copiés dans `src/lib/components/ui/`)         |
| Langage         | TypeScript strict                                                       |
| Langues         | Paraglide (`@inlang/paraglide-js`), catalogues compilés                 |
| Prod            | nginx alpine                                                            |
| Tests unitaires | Vitest + @testing-library/svelte                                        |
| Tests E2E       | Playwright, contre la vraie API (pas d'enregistrement HTTP)             |
| Qualité         | svelte-check, ESLint, Prettier                                          |
| Node            | 22 LTS, identique en dev, en CI et au build de l'image                  |

## URL de l'API

Le front et l'API sont servis depuis la **même origine** (le même reverse proxy
nginx), donc pas de CORS : le client API utilise le chemin relatif `/api`
(`src/lib/api.ts`).

- **Production** : le reverse proxy en amont route `/api` vers Django et le
  reste vers cette SPA.
- **Dev / preview** : le proxy Vite (`vite.config.ts`) redirige `/api` vers
  `API_URL` (`http://localhost:8000` par défaut) sans toucher au chemin :
  Django sert ses routes sous `/api/`, préfixe compris.

La session est portée par le cookie `sessionid` d'allauth, `httpOnly` : le
client envoie `credentials: 'same-origin'`, et recopie le cookie `csrftoken`
dans l'en-tête `X-CSRFToken` sur toute méthode non sûre, faute de quoi Django
répond `403` avant d'atteindre la vue.

## Emails

Les liens de vérification d'adresse et de réinitialisation de mot de passe sont
composés par l'API à partir de `FRONTEND_URL` et pointent vers ce front. En
développement comme en CI, les emails partent vers
[Mailpit](https://mailpit.axllent.org) : interface sur <http://localhost:8025>,
et c'est son API HTTP que lisent les tests E2E pour suivre les liens.

## Quickstart

```bash
npm ci
npm run dev          # http://localhost:5173 (API attendue sur :8000)
```

Ou tout en Docker (front + API) :

```bash
make up              # front sur :5173, api sur :8000
make down
```

## Développement

```bash
npm run check        # svelte-check
npm run lint         # eslint
npm run format       # prettier --write
npm run test:unit    # vitest — composants uniquement (*.svelte.test.ts, jsdom)
npm run test:e2e     # playwright — nécessite l'API sur :8000
npm run build        # SPA statique dans build/
```

Politique de tests : les tests unitaires ne couvrent que les composants ; tout
le reste (client API, flux complets) est couvert en E2E contre la vraie API.
Lancez l'API au préalable (`make up` ici ou dans son dépôt). La CI fait de même
avec l'image de l'API en service : tag `dev` sur les branches et PRs, tag
`x.y.z` quand la CI tourne sur un tag de release — le front publie alors son
image avec le même tag que l'API, plus un tag `dev` à chaque merge sur `main`.

Un devcontainer est fourni (`.devcontainer/`), basé sur le service compose
`front` (`Dockerfile.dev`) : Node 24 et Playwright avec Chromium y sont
préinstallés (navigateurs dans `/opt/pw-browsers`, hors du bind mount), donc
`npm run test:e2e` fonctionne directement dans le conteneur — l'API du compose
est joignable via `API_URL=http://api:8000`.

## shadcn-svelte

Les composants UI sont vendorés dans `src/lib/components/ui/` (voir
`components.json`). Pour en ajouter :

```bash
npx shadcn-svelte@latest add <component>
```

## Langues

L'interface est traduite avec [Paraglide](https://paraglidejs.com), qui **compile** les catalogues en fonctions de message plutôt que de les résoudre à l'exécution : ce qui n'est appelé nulle part sort du bundle, la bonne propriété pour une SPA statique que le navigateur télécharge en entier.

Les textes vivent dans `messages/fr.json` et `messages/en.json`, la sortie compilée dans `src/lib/paraglide/` — générée, donc hors git, hors Prettier et hors ESLint.

```bash
npm run paraglide    # recompile les catalogues ; Vite et npm ci le font aussi
```

La locale a une source unique, `src/lib/locale.svelte.ts` : la langue enregistrée sur le compte, sinon celle du navigateur, sinon le français. C'est elle que lisent les fonctions de message, l'attribut `lang` du document et le formatage des dates. La préférence de compte voyage avec la charge utile de session ; tant que l'API ne l'y met pas, tout le monde suit son navigateur.

Les deux suites de tests fixent leur locale à `fr-FR` au lieu de l'hériter de la machine : leurs locators français assertent l'interface française.

## Version déployée

Le pied de page nomme le déploiement, front et API côte à côte : c'est la
**paire** qui décrit ce qui tourne, une image de front récente devant une API
ancienne étant précisément le décalage qu'on ne voit pas autrement.

Chaque côté annonce deux valeurs, la même convention des deux : le **ref git**
de l'image — le tag sur une release, la branche sinon — et le **commit court**.
Un ref suffit à identifier une release ; sur l'image `dev`, que suit la
pré-production, seul le commit distingue deux builds.

Le commit n'est affiché qu'aux administrateurs. Le front ne le décide pas : il
montre les deux commits quand `/api/health/` lui donne le sien, ce que l'API ne
fait que pour un compte `is_staff`. Un utilisateur ordinaire lit donc les deux
refs, ce qui suffit à joindre une version à un rapport de bug.

Les deux valeurs entrent par `APP_VERSION` et `APP_COMMIT`, arguments de build
passés par la CI depuis ses variables d'environnement. Elles ne peuvent pas
être devinées : `.dockerignore` exclut `.git` et l'image de build n'a pas git,
donc un `git describe` retomberait silencieusement sur `dev` dans **toutes**
les images publiées. Hors image publiée — `npm run dev`, tests — les deux
valent `dev`.

`APP_COMMIT` alimente aussi `kit.version.name`, que SvelteKit compare pour
détecter une nouvelle version (`updated`) : il change à chaque build publié, là
où le ref reste `main` pendant des semaines.

## Image de production

`Dockerfile` : build Node 24 → `nginx:alpine` qui sert `build/` avec fallback
SPA (`nginx/toutpris.conf`). L'image n'a aucune configuration au runtime : le
routage `/api` est du ressort du reverse proxy commun avec l'API.

L'image publiée est multi-architecture (`linux/amd64` et `linux/arm64`), donc
déployable sur un Raspberry Pi. Le build de la SPA tourne en natif sur le
runner (`--platform=$BUILDPLATFORM`), seule l'image finale est construite par
architecture.

```bash
make docker-build
docker run --rm -p 8080:80 tout-pris-front
```
