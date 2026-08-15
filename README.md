# tout-pris-front

Frontend SvelteKit for Tout Pris — SPA statique servie par nginx, consommant l'API
[tout-pris-back](https://github.com/Haelle/tout-pris-back) (FastAPI).

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
| Prod            | nginx alpine                                                            |
| Tests unitaires | Vitest + @testing-library/svelte                                        |
| Tests E2E       | Playwright, contre le vrai backend (pas d'enregistrement HTTP)          |
| Qualité         | svelte-check, ESLint, Prettier                                          |
| Node            | 22 LTS, identique en dev, en CI et au build de l'image                  |

## URL du backend

Le front et le back sont servis depuis la **même origine** (même reverse proxy
nginx que tout-pris-back), donc pas de CORS : le client API utilise le chemin
relatif `/api` (`src/lib/api.ts`).

- **Production** : le reverse proxy en amont route `/api` vers FastAPI et le
  reste vers cette SPA.
- **Dev / preview** : le proxy Vite (`vite.config.ts`) redirige `/api` vers
  `BACKEND_URL` (`http://localhost:8000` par défaut) en retirant le préfixe.

## Quickstart

```bash
npm ci
npm run dev          # http://localhost:5173 (backend attendu sur :8000)
```

Ou tout en Docker (front + back) :

```bash
make up              # front sur :5173, api sur :8000
make down
```

## Développement

```bash
npm run check        # svelte-check
npm run lint         # eslint
npm run format       # prettier --write
npm run test:unit    # vitest (composants jsdom + modules node)
npm run test:e2e     # playwright — nécessite le back sur :8000
npm run build        # SPA statique dans build/
```

Les E2E tournent contre le vrai backend : lancez `tout-pris-back` au préalable
(`make up` dans son dépôt, ou `uv run uvicorn app.main:app`). La CI fait de
même en démarrant le back en service.

Un devcontainer est fourni (`.devcontainer/`), basé sur le service compose
`front` (`Dockerfile.dev`) : Node 22 et Playwright avec Chromium y sont
préinstallés (navigateurs dans `/opt/pw-browsers`, hors du bind mount), donc
`npm run test:e2e` fonctionne directement dans le conteneur — le back du
compose est joignable via `BACKEND_URL=http://api:8000`.

## shadcn-svelte

Les composants UI sont vendorés dans `src/lib/components/ui/` (voir
`components.json`). Pour en ajouter :

```bash
npx shadcn-svelte@latest add <component>
```

## Image de production

`Dockerfile` : build Node 22 → `nginx:alpine` qui sert `build/` avec fallback
SPA (`nginx/toutpris.conf`). L'image n'a aucune configuration au runtime : le
routage `/api` est du ressort du reverse proxy commun avec le back.

```bash
make docker-build
docker run --rm -p 8080:80 tout-pris-front
```
