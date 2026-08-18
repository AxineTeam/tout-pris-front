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
RUN npm run build

FROM nginx:alpine

COPY nginx/toutpris.conf /etc/nginx/nginx.conf
COPY --from=build /app/build /var/www

EXPOSE 80
