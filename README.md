# bigdaddy

Heavy-equipment service information system (parts catalog, service documents,
repair procedures, fault-code troubleshooting, 3D viewer, cart). Portfolio
project. All data is synthetic and generated with a fixed seed.

## Requirements

- Node 26 (see `.nvmrc`), which includes npm 10 or later

## Commands

```bash
npm ci                # clean install of all workspaces from package-lock.json
npm test              # run Mocha tests in every workspace
npm run test:coverage # run tests with c8 coverage (80% lines and branches)
npm run lint          # ESLint on every workspace, zero warnings allowed
npm run format        # Prettier: rewrite files
npm run format:check  # Prettier: check only
npm run check         # lint, format check and tests
```

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request:

| Job               | What it checks                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| Lint and format   | ESLint (zero warnings) and Prettier                                      |
| Test and coverage | Mocha with c8: 80% lines and branches per workspace, and 80% on new code |
| OpenAPI lint      | Spectral on `apps/api/openapi/openapi.yaml`                              |
| PR title          | Conventional Commit format (the squash commit message)                   |
| CI passed         | Aggregates the jobs above; this is the required check                    |

Run the same checks locally with `npm run check`, and `npm run test:coverage` for coverage.
Check new-code coverage locally after a coverage run with
`node scripts/new-code-coverage.mjs --base develop`.

## Layout

| Path              | Purpose                      |
| ----------------- | ---------------------------- |
| `apps/web`        | Vue 3 frontend (JavaScript)  |
| `apps/api`        | NestJS backend (TypeScript)  |
| `packages/seed`   | Synthetic data seed scripts  |
| `packages/config` | Shared tooling configuration |
| `infra`           | Docker Compose and Terraform |
| `docs`            | Documentation and ADRs       |
| `.github`         | Workflows and templates      |
