---
name: devops-deployment
description: Ship Next.js web portals safely — CI/CD pipelines (GitHub Actions), Docker standalone builds, Vercel/AWS/Kubernetes deploys, environment and secrets management, database migrations, preview environments, feature flags, zero-downtime and rollback strategies, caching of builds, and release checklists. Use this skill whenever the user asks about deploying, CI, Docker, pipelines, environments, hosting, migrations in production, rollbacks, or "how do I put this online".
---

# DevOps & Deployment

Every commit to `main` should be deployable; every deploy should be reversible.

## Pipeline stages
1. **Install** (cached) → 2. **Lint + typecheck** → 3. **Unit tests** → 4. **Build** → 5. **E2E against preview** → 6. **Deploy staging** → 7. **Migrate + deploy prod** → 8. **Smoke test + monitor**.
Fail fast; run 2–3 in parallel.

## GitHub Actions
```yaml
name: ci
on:
  pull_request:
  push: { branches: [main] }
concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck
      - run: pnpm test -- --coverage
      - uses: actions/cache@v4
        with:
          path: .next/cache
          key: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('src/**') }}
          restore-keys: nextjs-${{ hashFiles('pnpm-lock.yaml') }}-
      - run: pnpm build
        env: { SKIP_ENV_VALIDATION: "true" }
  e2e:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with: { name: playwright-report, path: playwright-report }
```
Add `npm audit`/`osv-scanner`, `gitleaks`, and CodeQL as separate jobs. Pin third-party actions by SHA for supply-chain safety.

## Docker (self-hosting)
```js
// next.config.ts
output: "standalone"
```
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```
Multi-instance self-hosting: configure a shared cache handler (Redis) and consistent `deploymentId`/build ID; serve `/_next/static` via CDN with long cache.

## Hosting options
| Option | Good for |
|---|---|
| Vercel | Fastest path, previews, ISR/edge built in |
| AWS (SST/OpenNext, Amplify) | AWS-native orgs |
| Container (ECS, Cloud Run, Fly, K8s) | Full control, long-running WS, compliance |
| Coolify/Dokku on VPS | Low cost, small teams |

## Environments & secrets
- `dev` → `preview` (per PR) → `staging` → `production`, each with isolated DB & keys.
- Secrets in the platform's secret store / Vault / AWS SSM — never in git or images.
- `NEXT_PUBLIC_*` are baked at **build** time; server env read at runtime. Build once, promote the same artifact where possible.
- Validate env at startup (zod) so misconfig fails the deploy, not the user.

## Database migrations
- Run migrations as a dedicated pipeline step before new code receives traffic (`prisma migrate deploy` / `drizzle-kit migrate`).
- **Expand → migrate → contract**: add nullable column → deploy code writing both → backfill → switch reads → drop old column in a later release.
- Never rename/drop columns in the same release that stops using them. Back up before destructive changes.
- Preview envs: branch databases (Neon/PlanetScale/Supabase branching) with seed data.

## Release safety
- Feature flags (LaunchDarkly, Statsig, Unleash, or DB-backed) to decouple deploy from release; gradual rollout by % or org.
- Blue/green or rolling deploys with readiness probes; canary for risky changes.
- **Rollback**: instant revert to previous deployment (Vercel "Promote", previous image tag). DB changes must be backward compatible so rollback is safe.
- Post-deploy: automated smoke tests, watch error rate & latency for 15 min, deploy markers in dashboards.

## Kubernetes essentials (if used)
Resource requests/limits, readiness/liveness probes on `/api/health`, HPA on CPU/RPS, PodDisruptionBudget, `terminationGracePeriodSeconds` for draining, secrets via External Secrets.

## Branching & versioning
Trunk-based with short-lived branches, required checks + reviews, conventional commits, automated changelog/release (Changesets / release-please), `APP_VERSION` = git SHA exposed in health endpoint & Sentry release.

## Release checklist
- [ ] CI green: lint, types, tests, E2E, security scans
- [ ] Env vars set & validated for target env
- [ ] Migrations backward compatible; backup taken
- [ ] Feature flags configured
- [ ] Source maps uploaded; release tagged
- [ ] Smoke tests pass; dashboards watched
- [ ] Rollback path verified
