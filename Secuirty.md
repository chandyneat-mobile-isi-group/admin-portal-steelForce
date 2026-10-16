# SteelForce Admin Portal — Security Blueprint

## Current security posture

The portal currently runs primarily as a client-side demonstration: data is mock data, mutations are held in browser memory, and the application has no database or server API in this repository. Client-side authentication and permission guards improve the interface but are not a security boundary. A production API must enforce every identity, permission, validation, and data-access rule.

## Security objectives

1. Authenticate every user through the approved identity provider.
2. Authorize every resource request with least-privilege permissions.
3. Protect credentials, tokens, customer data, sales data, and audit records.
4. Validate all untrusted input at the server boundary.
5. Make material user and security actions traceable.
6. Fail closed when identity, policy, or integration state is uncertain.

## Authentication

- The API integration uses OAuth2 password and refresh-token grants against an OpenIddict-compatible token endpoint.
- Send credentials only over HTTPS. Never log passwords, access tokens, refresh tokens, or full authorization headers.
- Use short-lived access tokens. The client refreshes one minute before expiry when a refresh token is available.
- Send `X-Device-Id` and `X-Device-Name` only as device metadata; do not treat either as authentication.
- On logout, clear local session data first and call server-side session revocation as a best-effort follow-up.
- Treat refresh failure, token expiry, revoked sessions, and malformed token payloads as sign-out conditions.
- Do not verify a JWT in the browser as a trust decision. The resource server must validate signature, issuer, audience, expiry, not-before time, and revocation/session status.

## Session and token storage

The current client session store is appropriate for a local demo but requires a deliberate production decision.

Preferred production pattern:

- Keep refresh tokens in `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict` where possible) cookies scoped to the auth path.
- Keep access tokens short-lived and preferably in memory; if browser storage is used, explicitly accept and mitigate the XSS exposure.
- Rotate refresh tokens and detect reuse on the identity server.
- Set cookie domains and paths narrowly, never use a wildcard production domain, and clear cookies with matching attributes on logout.
- Implement CSRF protection for any cookie-authenticated state-changing endpoint (SameSite, origin checks, and a CSRF token where needed).

## Authorization

- Define permissions as stable, explicit capabilities such as `customers.view`, `users.manage`, and `settings.manage`.
- Maintain `lib/auth/authorization.ts` as the client UX route policy. Its longest-prefix matching and default-deny behavior must remain intact.
- Enforce the equivalent required permission on every API endpoint and service action. Never rely on hidden buttons, route guards, role labels, or frontend claims alone.
- Check object-level access as well as feature-level permission: a user permitted to view customers must only retrieve customers in their authorized organization, region, or assignment.
- Derive navigation visibility from permissions, but do not regard hidden navigation as authorization.
- Reject unrecognized permissions and unknown protected routes by default.

## API security baseline

| Area | Required control |
| --- | --- |
| Transport | HTTPS only; redirect HTTP at the edge; enable HSTS in production. |
| Authentication | Validate JWT signature, issuer, audience, expiry, `nbf`, and token type. |
| Authorization | Endpoint and object-level checks in the API/service layer. |
| Input | Validate schema, type, length, format, and business constraints server-side. |
| Output | Return only required fields; never return password hashes, secrets, or excess PII. |
| CORS | Allow only known frontend origins, methods, and headers; no wildcard with credentials. |
| Errors | Return safe, normalized client errors; log diagnostic details server-side. |
| Rate limits | Limit sign-in, refresh, password-reset, upload, and costly report endpoints. |
| Audit | Record login, logout/revocation, role/permission, account, export, and destructive actions. |
| Dependencies | Review and patch dependency vulnerabilities on a regular cadence. |

The shared `lib/api/client.ts` is the required frontend transport boundary for feature APIs. It adds a bearer token from the existing `AuthProvider`, generates a correlation ID per request, enforces a timeout and cancellation signal, normalizes failures, and clears the frontend session after a `401`. Repositories must not use `fetch` directly or accept arbitrary absolute URLs.

## Frontend security rules

- Never commit `.env` files with real credentials. Store production secrets in the deployment platform’s secret manager.
- Only variables prefixed with `NEXT_PUBLIC_` may be exposed to the browser. Never put secrets in such variables.
- Do not use `dangerouslySetInnerHTML` with untrusted content. If rich text is required, sanitize it using an allowlist before rendering.
- Avoid dynamic code execution (`eval`, `new Function`) and unreviewed third-party scripts.
- Escape user-derived content by rendering it normally through React; do not concatenate it into HTML, URLs, or CSS.
- Validate redirect destinations against an allowlist to prevent open redirects.
- Keep source maps and detailed runtime error data private in production where feasible.

## Headers and browser protections

Configure these at the deployment edge or in `next.config.js`, then test them against all routes:

- `Content-Security-Policy`: start restrictive; allow only approved script, style, image, connection, and map providers.
- `Strict-Transport-Security`: production HTTPS domains only.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` (or stricter if compatible).
- `Permissions-Policy`: disable unused browser capabilities.
- `frame-ancestors 'none'` in CSP, or `X-Frame-Options: DENY`, unless approved embedding is needed.

Tune CSP carefully for Next.js, analytics, Google Maps, and any other selected provider; do not add broad `*` origins or `unsafe-eval` merely to silence a violation.

## Data protection and operations

- Classify customer, employee, sales, and location records as confidential business data.
- Encrypt data in transit and at rest. Limit production database and backup access to named operational roles.
- Apply retention periods for logs, login history, exports, and inactive sessions; securely delete data at the end of retention.
- Mask or minimize PII in logs, telemetry, screenshots, and support tickets.
- Back up production data, test restoration, and document recovery ownership.
- Use separate development, staging, and production credentials, projects, databases, and OAuth clients.

## Security release checklist

- [ ] No real secrets, tokens, passwords, or production data are committed.
- [ ] API authentication and authorization are verified independently of the UI.
- [ ] New routes have a `ROUTE_RULES` policy and new APIs have server-side permission checks.
- [ ] User input and query filters have server-side validation and parameterized database access.
- [ ] CORS, cookie settings, CSP, and security headers are reviewed for the deployed domain.
- [ ] Rate limits and audit events cover sensitive operations.
- [ ] `npm run typecheck`, `npm run lint`, and a production build pass.
- [ ] Dependency and platform security advisories have been reviewed.
