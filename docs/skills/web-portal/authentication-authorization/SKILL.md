---
name: authentication-authorization
description: Implement secure login, sessions, OAuth/OIDC, MFA, password handling, and role/permission-based access control (RBAC/ABAC, multi-tenant) in Next.js portals using Auth.js/NextAuth, Clerk, Supabase, or custom sessions. Use this skill whenever the user mentions login, signup, sessions, JWT, OAuth, SSO, roles, permissions, protected routes, admin-only pages, tenants/organizations, or "who can access what".
---

# Authentication & Authorization

**AuthN** = who are you. **AuthZ** = what may you do. Get AuthN from a proven library; design AuthZ deliberately and enforce it on the server, every time.

## Choosing an approach
| Need | Choice |
|---|---|
| Fast, hosted, orgs + MFA built-in | Clerk / Auth0 / WorkOS |
| Self-hosted, OAuth + DB sessions | Auth.js (NextAuth v5) |
| Supabase stack | Supabase Auth + RLS |
| Enterprise SSO | OIDC/SAML via WorkOS/Auth0/Keycloak |
Don't roll your own crypto or password reset flows unless required.

## Sessions
- Prefer **database sessions** (revocable) or short-lived JWT (≤15 min) + rotating refresh token.
- Store in cookie: `__Host-session`, `httpOnly`, `secure`, `sameSite=lax`.
- Never store tokens in `localStorage`.
- Rotate session ID on login and privilege change; invalidate on logout and password change.

## Auth.js setup (sketch)
```ts
// lib/auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [GitHub],
  callbacks: { session: ({ session, user }) => ({ ...session, user: { ...session.user, id: user.id, role: user.role } }) },
});
// app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;
```

## Central guards
```ts
// lib/authz.ts
import "server-only";
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}
export async function requirePermission(perm: Permission) {
  const user = await requireUser();
  if (!can(user, perm)) throw new ForbiddenError(perm);
  return user;
}
```

## Permission model (RBAC)
```ts
export const PERMISSIONS = {
  admin:  ["users:read", "users:write", "billing:manage", "reports:read"],
  member: ["users:read", "reports:read"],
  viewer: ["reports:read"],
} as const satisfies Record<Role, readonly string[]>;
export type Permission = (typeof PERMISSIONS)[Role][number];
export const can = (u: { role: Role }, p: Permission) => (PERMISSIONS[u.role] as readonly string[]).includes(p);
```
Check **permissions**, not roles, in code (`can(user,"billing:manage")`, not `role === "admin"`).
Add ABAC for ownership: `can(user,"doc:edit") && doc.ownerId === user.id`.

## Multi-tenancy
- Every tenant-scoped row has `orgId`; every query filters by `session.orgId`.
- Enforce in a data-access layer (or Postgres RLS) so it can't be forgotten.
- Validate active org membership on every request, not just at login.

## Enforcement layers (defense in depth)
1. **Middleware**: redirect if no session cookie (cheap, optimistic only).
2. **Layout/page**: `await requireUser()` for UX.
3. **Server Actions / Route Handlers / queries**: `requirePermission` + ownership check — *the real gate*.
4. **Database**: tenant filter / RLS.
5. **UI**: hide buttons the user can't use (convenience, not security).

```ts
// middleware.ts
export function middleware(req: NextRequest) {
  const has = req.cookies.has("__Host-session") || req.cookies.has("authjs.session-token");
  if (!has && req.nextUrl.pathname.startsWith("/dashboard"))
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
}
export const config = { matcher: ["/((?!_next|api/auth|favicon.ico).*)"] };
```
Validate `next` redirects are same-origin relative paths (open-redirect prevention).

## Passwords (if you must)
- Hash with **argon2id** (or bcrypt cost ≥12). Min length 12, check against breached lists (HIBP k-anonymity).
- Uniform error "Invalid email or password"; same timing for unknown users.
- Reset tokens: random 32 bytes, stored hashed, single-use, 15–60 min expiry.
- Rate limit + lockout/backoff; offer MFA (TOTP/WebAuthn passkeys).

## OAuth/OIDC essentials
Use Authorization Code + PKCE, validate `state` and `nonce`, verify ID token signature/issuer/audience, restrict redirect URIs exactly.

## Testing
Test each role against each protected action (matrix test), including cross-tenant access attempts that must fail.

## Checklist
- [ ] Authz enforced in every action/handler, not just middleware
- [ ] Permission-based checks, centralized
- [ ] Tenant scoping on every query
- [ ] Secure cookie flags, session rotation, revocation
- [ ] Safe redirects; rate-limited auth endpoints
- [ ] Role × action test matrix passes
