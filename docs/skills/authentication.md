# Authentication

One auth system. Do not add a second.

## Pieces

| Piece | File | Responsibility |
| --- | --- | --- |
| `AuthProvider` | `src/lib/auth/auth-context.tsx` | Session state machine: restore, authenticate, refresh, expire, logout |
| `AuthRepository` | `src/infrastructure/auth/repository.ts` | Separates the flow from its implementation |
| `ApiAuthRepository` | `src/infrastructure/auth/repository.ts` | OAuth2 / OpenIddict token endpoint |
| `StaticAuthRepository` | `src/infrastructure/auth/repository.ts` | Offline demo accounts |
| `session-store.ts` | `src/infrastructure/storage/session-store.ts` | Browser persistence of an eligible session |
| `jwt.ts` | `src/infrastructure/auth/jwt.ts` | Decodes the access token — **decode only, never verify** |
| `device-id.ts` | `src/infrastructure/storage/device-id.ts` | Stable device identifier sent as request metadata |

`NEXT_PUBLIC_AUTH_MODE` selects the implementation, defaulting to `api` in
production and `static` in development. It is read through
`src/config/environment.ts`, never from `process.env` directly.

## `jwt.ts` decodes, it does not verify

`decodeAccessToken()` base64-decodes the payload to read identity, permissions,
and expiry so the UI can render. It performs **no signature check**, and it
cannot: verification needs a secret or public key, and anything shipped to a
browser is public.

Treat decoded claims as a hint for presentation. The server validates the token
on every request. A client that trusted its own decode would accept any forged
token pasted into storage.

## Device headers are metadata

`X-Device-Id` and `X-Device-Name` support session listings and audit logs. They
are attacker-controlled strings and must never be treated as an authentication
factor.

## Adding an authenticated call

Use the shared mechanism — never attach a token by hand. `ApiClient` reads it
from the registered `ApiAuthProvider` and sets the `Authorization` header, and a
401 response invokes `onUnauthorized()` so `AuthProvider` can clear the session
in one place.

Feature code should call a repository and stay unaware that a token exists.

## Never log secrets

Passwords, access tokens, refresh tokens, and full session payloads must not
reach `console.*` or any monitoring sink — including in temporary debugging that
you intend to remove.
