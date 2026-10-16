---
name: seo-web-vitals
description: Improve search visibility and Core Web Vitals (LCP, INP, CLS) for Next.js sites — Metadata API, Open Graph, canonical URLs, sitemap.xml, robots.txt, JSON-LD structured data, i18n hreflang, indexability, and concrete fixes for slow LCP, poor INP, and layout shift. Use this skill whenever the user mentions SEO, Google ranking, meta tags, social previews, sitemap, Lighthouse/PageSpeed scores, Core Web Vitals, LCP/INP/CLS, or a public marketing page.
---

# SEO & Core Web Vitals

## Targets (p75 of real users)
| Metric | Good | Measures |
|---|---|---|
| LCP | ≤ 2.5s | loading of main content |
| INP | ≤ 200ms | responsiveness to interactions |
| CLS | ≤ 0.1 | visual stability |
Field data (CrUX / RUM) is what Google uses; Lighthouse is lab data for debugging.

## Metadata API
```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://portal.example.com"),
  title: { default: "Example Portal", template: "%s | Example Portal" },
  description: "Manage invoices, customers and reports in one place.",
  openGraph: { type: "website", siteName: "Example Portal", images: ["/og.png"] },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { type: "article", publishedTime: post.publishedAt, images: [post.cover] },
  };
}
```
Dynamic OG images: `opengraph-image.tsx` with `ImageResponse`.
Unique title (≤60 chars) and description (≤155 chars) per page.

## Indexability
- Authenticated portal pages: `robots: { index: false }` and block in robots.txt; public marketing/docs indexed.
- Server-render indexable content (no client-only fetch for primary content).
- One canonical URL per page; normalize trailing slashes and query params.
- Staging/preview: `noindex` via header `X-Robots-Tag: noindex`.

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/settings"] }], sitemap: "https://portal.example.com/sitemap.xml" };
}
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();
  return [
    { url: "https://portal.example.com", changeFrequency: "weekly", priority: 1 },
    ...posts.map(p => ({ url: `https://portal.example.com/blog/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
```
Large sites: `generateSitemaps` to split (≤50k URLs each).

## Structured data
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org", "@type": "Organization",
  name: "Example", url: "https://portal.example.com", logo: "https://portal.example.com/logo.png",
}).replace(/</g, "\\u003c") }} />
```
Use Article, Product, FAQPage, BreadcrumbList, SoftwareApplication as relevant. Validate with Rich Results Test.

## Content & semantics
One `h1`, descriptive headings, meaningful link text, image `alt`, internal links, fast & mobile-friendly, HTTPS. i18n: `alternates.languages` for hreflang and localized URLs (`/km/…`, `/en/…`).

## Fixing LCP
1. Identify LCP element (DevTools Performance → LCP marker).
2. Reduce TTFB: static/cached rendering, CDN, DB near compute.
3. LCP image: `next/image` with `priority` (fetchpriority high), correct `sizes`, AVIF/WebP, not lazy-loaded, not a CSS background.
4. Remove render-blocking: `next/font`, minimal critical CSS, defer third-party scripts.
5. Don't hide the hero behind client-side data fetching or animations starting at opacity 0.

## Fixing INP
1. Find slow interactions (Web Vitals attribution build / Performance panel).
2. Break long tasks: `useTransition`, `useDeferredValue`, `scheduler.yield()` / `await new Promise(r => setTimeout(r))` in loops.
3. Reduce JS: fewer client components, code-split, remove heavy libs.
4. Give immediate visual feedback before expensive work.
5. Virtualize big lists; avoid layout thrashing (batch DOM reads/writes).
6. Audit third-party scripts (chat, tag managers) — often the main culprit.

## Fixing CLS
- Always set `width`/`height` (or aspect-ratio) on images, video, iframes, ads.
- Reserve space for skeletons matching final size.
- `next/font` (size-adjusted fallback) to avoid font swap shifts.
- Don't inject banners above existing content; use overlays or reserved slots.
- Animate with `transform`/`opacity`, not `top`/`height`.

## Measurement workflow
- Lab: Lighthouse CI on PRs with budgets (`lighthouserc` assertions: LCP < 2.5s, CLS < 0.1, TBT < 200ms).
- Field: `useReportWebVitals` / Vercel Speed Insights / PageSpeed Insights (CrUX).
- Search Console: coverage, Core Web Vitals report, sitemaps.

## Checklist
- [ ] Unique title/description/canonical per public page
- [ ] OG/Twitter images render correctly
- [ ] robots.ts & sitemap.ts; private routes noindex
- [ ] JSON-LD validated
- [ ] LCP image prioritized; fonts via next/font
- [ ] No layout shift from media/fonts/banners
- [ ] Long tasks broken up; third parties deferred
- [ ] Lighthouse CI budgets + field data monitored
