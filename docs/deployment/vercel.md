# Deploying the Admin Portal to Vercel

**For:** whoever sets up or maintains the Vercel project.

## How it works on Vercel

- **Framework:** Next.js 13.5 (App Router), built by Vercel's own Next.js builder. `vercel.json` pins `npm ci`, `next build`, and the Singapore region (`sin1`), the closest to Cambodia.
- **Node:** 20.x, from `engines` in `package.json`. The Docker image uses Node 20 too.
- **API calls:** the browser calls the portal's own `/api/*`, `/docs/*` and `/files/*`. `next.config.js` rewrites these to the backend, so there is no CORS setup.
- **Standalone output:** off on Vercel. `next.config.js` turns it on only when `VERCEL` is not set, so the Docker image still gets its standalone bundle.

## Project settings

1. **Import the repository** and set the **Root Directory** to the folder that holds this `package.json` (`admin-web-portal` in the monorepo).
2. **Framework preset:** Next.js. Leave the build, install and output settings as they are; `vercel.json` sets them.
3. **Environment variables:** add the ones below for **Production** and **Preview**.

Every value is read **at build time**. The `NEXT_PUBLIC_*` values are compiled into the browser bundle, and the rewrite target is fixed when `next.config.js` loads. After changing any of them, **redeploy**; a restart is not enough.

| Variable | Value | Notes |
|---|---|---|
| `API_PROXY_URL` | The public backend URL, e.g. `https://www.pnc-spts-stg-api.me` | **Required.** It must not be `localhost`. When unset it falls back to staging. |
| `NEXT_PUBLIC_API_BASE_URL` | *(empty)* | Empty means the portal calls the API through its own `/api` rewrite. |
| `NEXT_PUBLIC_AUTH_API_URL` | `/api/v1/auth` | |
| `NEXT_PUBLIC_AUTH_MODE` | `api` | `static` is the offline demo login. Never use it in production. |
| `NEXT_PUBLIC_USER_MANAGEMENT_API` | `true` | Uses the real users and roles API instead of the demo store. |
| `NEXT_PUBLIC_DEPOTS_API` | `true` or `false` | `true` serves depots from `/api/v1/customers`. |
| `NEXT_PUBLIC_API_TIMEOUT` | `15000` | Milliseconds. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | The browser key | Optional. Restrict it to the Vercel domains in Google Cloud. |

Nothing here is a secret: every `NEXT_PUBLIC_*` value ships to the browser.

## Backend checklist

- [ ] **CORS:** not needed, because the browser only talks to the portal's own domain.
- [ ] **Cookies or auth redirects:** if the backend issues any, they must work through the proxied domain.
- [ ] **Uploads:** test the Excel imports (promotions, call plans) and avatar uploads once on the Vercel domain. They go through the rewrite proxy.

## Verify a deployment

1. Open `/login` and sign in with a real account.
2. Open the Dashboard, Depots and Promotions, and confirm data loads with no "configuration" errors.
3. In the browser's network tab, confirm the requests go to `https://<your-vercel-domain>/api/v1/...` and return 200.

## Local production check

Run this without stopping the dev server: it builds into a separate folder.

```bash
VERCEL=1 API_PROXY_URL=https://www.pnc-spts-stg-api.me NEXT_DIST_DIR=.next-vercel-check npx next build
rm -rf .next-vercel-check   # next build also adds this folder to tsconfig.json "include"; remove that line
```
