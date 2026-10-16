---
name: web-security
description: Secure web applications against OWASP Top 10 risks — XSS, CSRF, SSRF, injection, security headers and CSP, secrets handling, input validation, file uploads, rate limiting, dependency security, and secure Next.js patterns. Use this skill whenever building forms, APIs, uploads, auth flows, rendering user content, configuring headers, handling secrets, or when the user asks to review/harden security — even if security isn't mentioned but user input or external data is involved.
---

# Web Security

Assume every input is hostile, every client is untrusted, and every secret will leak if it reaches the browser.

## Threat checklist (OWASP-aligned)
| Risk | Primary defense |
|---|---|
| Broken access control | Authorize every action server-side, by resource owner/tenant |
| Injection (SQL/NoSQL/command) | Parameterized queries / ORM; never string-concat; no `exec` with input |
| XSS | React escaping; no `dangerouslySetInnerHTML` without DOMPurify; strict CSP |
| CSRF | SameSite cookies; Server Actions' origin check; CSRF token for cookie-auth route handlers |
| SSRF | Allowlist outbound hosts; block private IP ranges; no user-controlled URLs to fetch |
| Security misconfig | Security headers, no verbose errors, disable `x-powered-by` |
| Vulnerable deps | `npm audit`, Dependabot/Renovate, lockfile committed |
| Sensitive data exposure | Minimal `select`, DTOs, no secrets in `NEXT_PUBLIC_*` |
| Insecure deserialization / mass assignment | Validate with zod; whitelist fields |

## Input validation
```ts
const Input = z.object({ title: z.string().trim().min(1).max(200), priority: z.enum(["low","high"]) }).strict();
const data = Input.parse(await req.json());   // .strict() rejects extra fields (mass assignment)
```

## Authorization (IDOR prevention)
```ts
const doc = await db.document.findFirst({ where: { id, orgId: session.orgId } });
if (!doc) return notFound();   // 404, not 403, to avoid enumeration
```
Server Actions are public HTTP endpoints — always authenticate and authorize inside them.

## Security headers (next.config)
```ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.example.com",
  "connect-src 'self' https://api.example.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
headers: async () => [{ source: "/(.*)", headers: [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
]}],
poweredByHeader: false,
```
For nonce-based CSP generate a nonce per request in middleware and set `Content-Security-Policy` there; read it via `headers()`. Start with `Content-Security-Policy-Report-Only`.

## Rendering user HTML
```tsx
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) }} />
```
Validate URLs: allow only `http:`/`https:` in user-supplied `href` (block `javascript:`).

## Cookies
`httpOnly: true, secure: true, sameSite: "lax"` (or `strict`), `path: "/"`, short `maxAge`. Prefix `__Host-` for session cookies.

## File uploads
- Enforce size limit and allowlist MIME + magic bytes (`file-type`).
- Rename to random IDs; store outside web root / in object storage with pre-signed URLs.
- Serve with `Content-Disposition: attachment` for untrusted types; never serve user SVG inline.
- Scan for malware if business-critical.

## Rate limiting
Apply to login, signup, password reset, OTP, search, and expensive APIs (e.g. `@upstash/ratelimit` keyed by IP + account). Return 429 with `Retry-After`.

## Secrets
- Only in server env / secret manager; validated in `lib/env.ts` with `server-only`.
- Never log tokens, passwords, full card numbers. Redact in logger.
- Rotate on exposure; use `gitleaks` in CI.

## SSRF guard
```ts
const ALLOWED = new Set(["api.partner.com"]);
const u = new URL(input);
if (u.protocol !== "https:" || !ALLOWED.has(u.hostname)) throw new Error("Blocked host");
```

## Webhooks
Verify signatures (HMAC with `timingSafeEqual`), check timestamp tolerance, make handlers idempotent.

## Errors
Return generic messages to clients; log details server-side with a correlation ID.

## Review checklist
- [ ] Every mutation/query checks authz by owner/tenant
- [ ] All input validated with strict schemas
- [ ] No raw HTML without sanitization; CSP deployed
- [ ] Security headers present (check securityheaders.com)
- [ ] Cookies httpOnly/secure/sameSite
- [ ] Rate limits on auth + expensive endpoints
- [ ] Uploads validated & isolated
- [ ] `npm audit` clean of high/critical; secrets scanning in CI
