# SteelForce Admin Web Portal — Next.js 13.5 (App Router)
#
#   deps    → deterministic `npm ci` against the committed package-lock.json
#   builder → `next build`, emitting the standalone server bundle
#   runner  → node + that bundle only. No npm, no source, no build toolchain.
#
# `runner` is deliberately the LAST stage, so docker-compose.yml needs no
# `target:` for this service (unlike backend-server, whose last stage is `dev`).
# If a `dev` stage is ever added here, it must go ABOVE runner or Compose will
# silently start shipping the development image.
#
# Build context is ./admin-web-portal (see docker-compose.yml).
#
# No `# syntax=` directive on purpose: pinning an external Dockerfile frontend
# makes every build fetch it from Docker Hub first. Nothing here needs a newer
# frontend than the one built into Docker 23+.

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# Stage 1 — dependencies
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# package-lock.json is the project's lock file, so npm is the package manager.
# `npm ci` fails loudly when the lock file and package.json disagree - that is
# the reproducible-build guarantee.
#
# Note there is no `--omit=dev`: this project declares typescript, tailwind and
# postcss under "dependencies", so omitting dev dependencies would remove the
# very packages `next build` needs. The runtime image stays small anyway,
# because the standalone bundle below carries only what the server imports.
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci

# ---------------------------------------------------------------------------
# Stage 2 — build
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# The static prototype has no backend: no proxy target, API URL or auth mode to
# bake in. The only optional build-time value is NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
# without it Planning uses the built-in demo map.
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runtime
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# PORT and HOSTNAME are what the standalone server reads. Compose sets both as
# well; these defaults keep `docker run` on this image working on its own.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `node` (uid 1000) ships with the official image, so no user is created here.
# public/ and .next/static are not part of the standalone bundle by design and
# must be copied alongside it, or every asset and stylesheet 404s.
COPY --from=builder --chown=node:node /app/public           ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static     ./.next/static

USER node

EXPOSE 3000

# Node 18+ has a global fetch, so this needs no extra package. Any response
# below 500 counts as healthy: `/` renders a client-side redirect to /login,
# so a 3xx or 4xx still proves the server is serving.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# The standalone build emits its own minimal server; `next start` is not used.
CMD ["node", "server.js"]
