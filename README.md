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
```

## Layout

| Path | Purpose |
|---|---|
| `apps/web` | Vue 3 frontend (JavaScript) |
| `apps/api` | NestJS backend (TypeScript) |
| `packages/seed` | Synthetic data seed scripts |
| `packages/config` | Shared tooling configuration |
| `infra` | Docker Compose and Terraform |
| `docs` | Documentation and ADRs |
| `.github` | Workflows and templates |