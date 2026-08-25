# Image de production : build Node 22 (même version qu'en dev et en CI),
# servie par nginx:alpine. Le routage /api vers le backend est fait par le
# reverse proxy en amont, pas par cette image.
#
# BUILDPLATFORM : la SPA compilée est identique quelle que soit l'architecture
# visée, donc le build tourne en natif sur le runner. Seule l'image finale est
# construite par architecture, ce qui évite d'émuler npm ci et vite build.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Ce que le pied de page affiche : le ref git et le commit court de l'image.
# Ils doivent entrer par ici — .dockerignore exclut .git et cette image n'a pas
# git, donc rien dans le build ne peut les retrouver. Après `npm ci`, pour ne
# pas invalider la couche des dépendances.
ARG APP_VERSION="dev"
ARG APP_COMMIT="dev"
ENV APP_VERSION=$APP_VERSION APP_COMMIT=$APP_COMMIT

RUN npm run build

FROM nginx:alpine

COPY nginx/toutpris.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /var/www

EXPOSE 80
