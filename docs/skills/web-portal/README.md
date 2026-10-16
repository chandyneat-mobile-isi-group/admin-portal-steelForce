# web-portal skills

20 Claude skills for building production-grade Next.js web portals.
Each folder contains a `SKILL.md` with YAML frontmatter (`name`, `description`) and guidance: principles, workflow, code patterns, anti-patterns, and a review checklist.

| Skill | Focus |
|---|---|
| nextjs-architecture | App Router structure, server/client boundaries, actions |
| typescript-engineering | Strict TS, zod, unions, branded types |
| react-performance | Re-renders, memoization, virtualization, transitions |
| nextjs-performance | Caching, streaming, images, bundles |
| web-security | OWASP, CSP/headers, validation, uploads, SSRF |
| authentication-authorization | Sessions, OAuth, RBAC, multi-tenancy |
| api-integration | Typed clients, retries, TanStack Query |
| realtime-data | SSE, WebSockets, reconnection, cache sync |
| ui-ux-design | Layouts, states, tables, forms, heuristics |
| design-system | Tokens, theming, cva components, Storybook |
| accessibility | WCAG 2.2 AA, keyboard, focus, axe |
| responsive-web | Mobile-first, container queries, responsive tables |
| state-management | Server/URL/form/local/global state |
| database-query-performance | Indexes, EXPLAIN, N+1, pagination, pooling |
| testing-playwright | E2E, storageState auth, locators, CI |
| testing-unit | Vitest, RTL, MSW |
| error-handling | Error taxonomy, boundaries, action results |
| observability | Logging, OTel, Sentry, RUM, SLOs |
| seo-web-vitals | Metadata, sitemap, JSON-LD, LCP/INP/CLS |
| devops-deployment | CI/CD, Docker, migrations, rollbacks |

## Install
- **Claude.ai**: Settings → Capabilities → Skills → upload each skill folder (zip a single folder per skill).
- **Claude Code**: copy folders into `~/.claude/skills/` (personal) or `.claude/skills/` (project).
