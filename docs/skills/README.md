# admin-portal-steelforce

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-4kjynmbu)

SteelForce admin portal — Next.js 13 App Router, Tailwind, EN/KM i18n.

## Data

There is no backend and no database. Every page reads from static mock data:

- `lib/mock-data.ts` — the seed records (departments, roles, users, activity
  logs, login sessions).
- `lib/mock-store.ts` — an in-memory store wrapping that seed. Creating,
  editing, deleting, toggling status, revoking sessions and saving the
  permissions matrix all work and persist for the browser session; a page
  reload resets everything back to the seed.

To change what the demo shows, edit `lib/mock-data.ts`.

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
