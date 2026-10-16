# admin-portal-steelforce

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-4kjynmbu)

SteelForce admin portal — Next.js 13 App Router, Tailwind, EN/KM i18n.

## Static prototype

This build is a fully static, frontend-only prototype. There is no backend,
database, API URL or identity provider, and no network request is made during
normal use.

**Sign in:** `admin@gmail.com` / `123456` (the login page shows them too). The mock
session lives in `sessionStorage`, so closing the tab signs you out.

- `src/services/mock/` — shared plumbing: simulated latency, localStorage-backed
  collections (`createPersistentStore`), CSV/PDF file generation for exports.
- `src/features/<module>/data/` — the seed records for each module (depots,
  materials, promotions, planning, visits, users, sales reps, orders, quotations,
  notifications, sessions…).
- `src/features/<module>/api.ts` and `repositories/` — mock services with the same
  contracts the pages always used; they read and write the local stores.
- `src/infrastructure/auth/repository.ts` — the mock sign-in.

Records you create, edit or delete persist in `localStorage` across reloads.
**Settings → System → Reset demo data** restores every seed.

The only optional setting is `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; without it the
planning and session maps use the built-in vector map.

## Deploy to Vercel

1. Vercel → Add New → Project → pick this repository.
2. Deploy.

No environment variables and no build-setting changes are required.

## Local development

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

To run a production build while a dev server is running, send it to a separate
directory so the two don't fight over `.next`:

```bash
NEXT_DIST_DIR=.next-prod npm run build
```
