.PHONY: install lint lint-fix lint-openapi format format-check test test-coverage check ci clean

install: ## Install all workspace dependencies
	npm ci

lint: ## Run ESLint across all workspaces
	npm run lint

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

lint-openapi: ## Lint the OpenAPI spec with Spectral
	npm run lint:openapi

format: ## Format all files with Prettier
	npm run format

format-check: ## Check formatting without writing
	npm run format:check

test: ## Run tests in all workspaces
	npm test

test-coverage: ## Run tests with c8 coverage enforcement
	npm run test:coverage

check: ## Run all quality gates (lint + format + tests)
	npm run check

ci: check lint-openapi ## Run the full CI suite locally

clean: ## Remove node_modules and coverage artifacts
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/coverage packages/*/coverage

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
