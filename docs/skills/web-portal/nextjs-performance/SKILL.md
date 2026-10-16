---
name: nextjs-performance
description: Optimize Next.js App Router apps — caching and revalidation, static vs dynamic rendering, streaming with Suspense, parallel data fetching, next/image, next/font, bundle analysis, Partial Prerendering, and edge/runtime choices. Use this skill whenever a Next.js page is slow, TTFB is high, the user asks about caching, revalidate, ISR, "use cache", bundle size, image optimization, or wants a faster Next.js site.
---

# Next.js Performance

Goal: serve as much as possible statically, stream the rest, and ship minimal client JS.

## Diagnose
1. `next build` output: check which routes are ○ static, ƒ dynamic. Unexpected ƒ = something opted out (cookies(), headers(), searchParams, uncached fetch).
2. `ANALYZE=true next build` with `@next/bundle-analyzer` for client bundle size.
3. Lighthouse / WebPageTest for LCP, TTFB; server logs/traces for slow data calls.

## Rendering strategy
| Content | Strategy |
|---|---|
| Marketing, docs | Static (default) |
| Catalog updated hourly | Static + time revalidation |
| Content from CMS | Static + on-demand `revalidateTag` via webhook |
| Per-user dashboard | Dynamic, streamed with Suspense |
| Mixed | Static shell + dynamic holes (PPR / Suspense) |

## Caching (check the project's Next.js version)
Next 15+: `fetch` is **not** cached by default. Opt in explicitly.
```ts
await fetch(url, { next: { revalidate: 3600, tags: ["products"] } });
```
Non-fetch data (DB/ORM):
```ts
import { unstable_cache } from "next/cache";
export const getProducts = unstable_cache(
  async () => db.product.findMany({ take: 50 }),
  ["products"],
  { revalidate: 3600, tags: ["products"] }
);
```
With `dynamicIO`/`useCache` enabled (Next 16 "Cache Components"):
```ts
"use cache";
import { cacheLife, cacheTag } from "next/cache";
export async function getProducts() { cacheLife("hours"); cacheTag("products"); return db.product.findMany(); }
```
Invalidate after mutations: `revalidateTag("products")` or `revalidatePath("/products")`.
Deduplicate per-request reads with React `cache()`.

**Never cache user-specific data under a shared key.** Include user/tenant id in the key or keep it dynamic.

## Kill waterfalls
```ts
// ❌ sequential
const user = await getUser(id); const orders = await getOrders(id);
// ✅ parallel
const [user, orders] = await Promise.all([getUser(id), getOrders(id)]);
```
Better: split into independent async Server Components each wrapped in `<Suspense>` so each streams when ready.
```tsx
export default function Page() {
  return (<>
    <Header />
    <Suspense fallback={<StatsSkeleton />}><Stats /></Suspense>
    <Suspense fallback={<TableSkeleton />}><RecentOrders /></Suspense>
  </>);
}
```

## Images
```tsx
import Image from "next/image";
<Image src={hero} alt="…" priority sizes="100vw" placeholder="blur" />   // LCP image: priority
<Image src={url} alt="…" width={320} height={200} sizes="(max-width: 768px) 50vw, 320px" />
```
Always set `sizes` for responsive images; configure `images.remotePatterns`; prefer AVIF/WebP (`images.formats`).

## Fonts
```ts
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
```
Self-hosted, no layout shift. Limit weights.

## Scripts & third parties
`next/script` with `strategy="lazyOnload"` for analytics/chat widgets; `@next/third-parties` for GTM/YouTube. Audit each third party's cost.

## Client JS diet
- Keep `"use client"` at leaves; server-render tables, markdown, formatting.
- `next/dynamic` for modals, charts, editors.
- `optimizePackageImports` in `next.config` for icon/UI libs.
- Replace moment → date-fns/Intl, lodash → native/lodash-es per-method.

## Navigation
- `<Link>` prefetches in viewport; set `prefetch={false}` for huge link lists.
- `loading.tsx` gives instant feedback.

## Config snippet
```ts
const nextConfig = {
  images: { formats: ["image/avif", "image/webp"], remotePatterns: [{ protocol: "https", hostname: "cdn.example.com" }] },
  experimental: { optimizePackageImports: ["lucide-react", "date-fns"] },
  compress: true,
};
```

## Runtime
Node runtime by default. Edge only for light, latency-sensitive logic with no Node APIs/heavy DB drivers. Put the DB in the same region as functions.

## Checklist
- [ ] Routes intended static are ○ in build output
- [ ] Data calls cached with tags; mutations revalidate
- [ ] No sequential awaits for independent data
- [ ] Suspense boundaries around slow sections
- [ ] LCP image uses `priority`; all images have `sizes`
- [ ] First-load JS per route < ~150KB gzip where possible
- [ ] Third-party scripts deferred
