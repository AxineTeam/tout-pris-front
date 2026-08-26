.PHONY: help install dev build check lint fmt test e2e up down logs docker-build

.DEFAULT_GOAL := help

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) |  awk 'BEGIN {FS = ":.*?## "} {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install npm dependencies
	npm ci

dev: ## Start the Vite dev server (API expected on :8000)
	npm run dev

build: ## Build the static SPA into build/
	npm run build

check: ## Run svelte-check
	npm run check

lint: ## Check lint and formatting
	npm run lint
	npm run format:check

fmt: ## Fix formatting
	npm run format

test: ## Run the unit test suite (components)
	npm run test:unit -- --run

e2e: ## Run Playwright e2e tests (API must be running)
	npm run test:e2e

up: ## Start front dev + API (docker compose, ports 5173/8000)
	docker compose up -d

down: ## Stop the compose stack
	docker compose down

logs: ## Follow the front container logs
	docker compose logs -f front

docker-build: ## Build the production image
	docker build -t tout-pris-front .
