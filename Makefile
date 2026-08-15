.PHONY: install dev build check lint fmt test e2e up down docker-build

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

check:
	npm run check

lint:
	npm run lint && npm run format:check

fmt:
	npm run format

test:
	npm run test:unit -- --run

e2e:
	npm run test:e2e

up:
	docker compose up -d

down:
	docker compose down

docker-build:
	docker build -t tout-pris-front .
