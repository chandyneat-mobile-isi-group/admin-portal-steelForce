# Authentication — Admin Portal Integration Guide

How the React Administration Portal signs in, authorises its UI, refreshes its
session, and signs out.

- **Base URL:** `https://<host>/api/v1`
- **Authentication:** bearer access token
- **Current browser flow:** employee ID/e-mail + password through the first-party
  JSON convenience endpoint

> [!IMPORTANT]
> The server does **not yet** enable OAuth authorization code + PKCE. Do not
> configure an `authorizationUrl`, redirect URI, or PKCE library against this API
> yet: `/connect/authorize` is not available. The current portal contract is
> documented below. When hosted login/MFA/SSO is introduced, migrate the portal
> to authorization code + PKCE as required by
> [ADR-0005](adr/0005-oauth-grant-selection.md).

---

## Contents

1. [Integration checklist](#integration-checklist)
2. [Sign in](#sign-in)
3. [Load the signed-in user and authorise the UI](#load-the-signed-in-user-and-authorise-the-ui)
4. [Token lifetime and refresh](#token-lifetime-and-refresh)
5. [Sign out and session management](#sign-out-and-session-management)
6. [Password and recovery endpoints](#password-and-recovery-endpoints)
7. [Errors](#errors)
8. [Browser security and deployment](#browser-security-and-deployment)
9. [React reference implementation](#react-reference-implementation)

---

## Integration checklist

- Configure the portal origin in `Cors:AllowedOrigins` (exact scheme, host and
  port; no path or wildcard).
- Present one sign-in field labelled **Employee ID or e-mail**.
- Sign in at `POST /api/v1/auth/login`; it accepts JSON and returns an unwrapped
  OAuth token payload.
- Keep the access token in memory. If the portal needs to survive a page reload,
  keep the refresh token only in `sessionStorage`, not `localStorage`.
- Call `GET /api/v1/auth/me` immediately after sign-in and build navigation from
  its effective `permissions`.
- Add `Authorization: Bearer <access_token>` to every protected API request.
- Use one shared refresh promise/mutex. Refresh tokens rotate and must never be
  exchanged concurrently.
- On refresh failure, clear local credentials and return to sign-in.

---

## Sign in

`POST /api/v1/auth/login`

```json
{
  "employeeId": "EMP000201",
  "password": "…",
  "deviceId": "admin-web:4adf9c9a-…",
  "deviceName": "Chrome on Chenda's MacBook",
  "platform": "Web",
  "appVersion": "2026.08.21",
  "timeZone": "Asia/Phnom_Penh",
  "language": "en-US"
}
```

`employeeId` accepts either a personnel number or an e-mail address. A stable
browser-profile identifier is recommended for `deviceId`; generate it once and
retain it in browser storage. It identifies a session for revocation only and
does not grant access.

The request is JSON for this first-party endpoint. The server translates it to
the OAuth password grant internally; do not send `grant_type`, `client_id`, or a
client secret from the portal.

### Successful response — 200

This response is **not** wrapped in the platform's usual `data` envelope.

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs…",
  "token_type": "Bearer",
  "expires_in": 899,
  "id_token": "eyJhbGciOiJSUzI1NiIs…",
  "refresh_token": "…"
}
```

Use `access_token` for API calls. The portal does not need `id_token`: use
`/auth/me` for the complete profile and effective permissions instead.

---

## Load the signed-in user and authorise the UI

`GET /api/v1/auth/me`

```http
Authorization: Bearer <access_token>
```

Unlike token responses, ordinary API responses use the platform envelope:

```json
{
  "data": {
    "userId": "019ffa68-ff2a-78f1-98ad-b356bc325fb6",
    "employeeId": "EMP000201",
    "fullName": "Sok Dara",
    "email": "sok.dara@isigroup.com.kh",
    "department": "Administration",
    "position": "System Administrator",
    "roles": ["Administrator"],
    "permissions": ["users.read", "users.create", "roles.manage"],
    "featureFlags": {},
    "language": "en-US",
    "timeZone": "Asia/Phnom_Penh",
    "theme": "system",
    "passwordExpiresAt": null,
    "lastLoginAt": "2026-08-21T09:00:00+07:00"
  },
  "meta": {
    "correlationId": "…",
    "timestamp": "…"
  }
}
```

Treat permissions as a UI capability set, not as security enforcement. For
example, show the user directory only when `permissions` contains `users.read`
and the role editor only when it contains `roles.manage`. Every API endpoint
performs its own server-side authorization, so a hidden button is never the
security boundary.

See [Administrator User Management — Admin Integration Guide](administrator-usermanagement-admin-integration.md)
for the permissions required by administration endpoints.

---

## Token lifetime and refresh

| Token | Lifetime | Handling |
|---|---:|---|
| Access token | 15 minutes | Send as a bearer token; retain in memory. |
| Refresh token | 14 days, sliding | Single-use, rotated on every exchange. |

Refresh through the JSON convenience endpoint:

`POST /api/v1/auth/refresh`

```json
{ "refreshToken": "<current refresh token>" }
```

The response has the same unwrapped OAuth shape as sign-in and contains a new
access token **and a new refresh token**. Write the replacement refresh token
before accepting the replacement access token.

Refresh proactively shortly before `expires_in`, or once after a protected
request receives `401`. Never start more than one refresh request at a time:
the second request would present an already-rotated token, which can trigger
reuse detection and revoke the whole token family. Retry the original request
only once after a successful refresh. If it still returns `401`, sign out.

Permission changes appear in an access token at the next refresh and are bounded
by the 15-minute access-token lifetime. Reload `/auth/me` after refresh when the
portal needs to update visible navigation immediately.

---

## Sign out and session management

### Sign out of this browser

`POST /api/v1/auth/logout`

```http
Authorization: Bearer <access_token>
Content-Type: application/json

{ "refreshToken": "<current refresh token>", "allDevices": false }
```

On either a `204 No Content` response or a network failure, clear the in-memory
access token and browser-session refresh token. Clearing local state is important:
the portal must not continue displaying protected data after an unsuccessful
logout call.

### Sign out everywhere

Send `{ "allDevices": true }` to the same endpoint. This revokes every active
session for the authenticated user.

### List and revoke sessions

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/v1/auth/sessions` | List the caller's active sessions. |
| `DELETE` | `/api/v1/auth/sessions/{sessionId}` | Revoke one of the caller's sessions. |

Both require the bearer token. The list identifies the current browser with
`isCurrent`; disabling that session should immediately clear local credentials.

---

## Password and recovery endpoints

| Method | Route | Auth | Behaviour |
|---|---|---|---|
| `POST` | `/auth/change-password` | Bearer | Send `currentPassword` and `newPassword`; all sessions are revoked on success. |
| `POST` | `/auth/forgot-password` | — | Send `{ "email": "…" }`; always answers `204` to prevent account enumeration. |
| `POST` | `/auth/reset-password` | — | Send `email`, the e-mail `token`, and `newPassword`. |
| `POST` | `/auth/verify-email` | — | Send `userId` and e-mail `token`. |
| `POST` | `/auth/resend-verification` | — | Send `{ "email": "…" }`; always answers `204`. |

The reset and verification links are built from `ClientApp:BaseUrl`,
`ResetPasswordPath`, and `VerifyEmailPath`. Production portal deployment must
therefore set `ClientApp:BaseUrl` to the portal's public HTTPS origin.

---

## Errors

The JSON convenience login and refresh routes are OAuth token endpoints, so their
failures use OAuth fields rather than `ProblemDetails`:

```json
{
  "error": "invalid_grant",
  "error_description": "The e-mail address or password is incorrect.",
  "error_uri": "https://docs.isigroup.com.kh/errors/Auth.InvalidCredentials"
}
```

Derive the platform error code from the final segment of `error_uri` and map that
code to a portal message. Do not branch on `error_description`.

All other endpoints use RFC 9457 ProblemDetails, including `errorCode`:

```json
{
  "type": "https://docs.isigroup.com.kh/errors/Auth.AccountLocked",
  "status": 403,
  "detail": "This account is temporarily locked after too many failed sign-in attempts. Please try again later.",
  "errorCode": "Auth.AccountLocked",
  "correlationId": "…"
}
```

Important sign-in outcomes:

| Code | Status | Portal behaviour |
|---|---:|---|
| `Auth.InvalidCredentials` | 401 | Show one generic message; unknown accounts and incorrect passwords are intentionally indistinguishable. |
| `Auth.AccountLocked` | 403 | Show the lockout message; do not retry automatically. |
| `Auth.AccountInactive` | 403 | Tell the user to contact an administrator. |
| `Auth.EmailNotConfirmed` | 403 | Offer the verification/resend flow when confirmation is required. |
| `Auth.PasswordExpired` | 403 | Direct the user to set a new password. |

Sensitive authentication and recovery endpoints are rate limited to 10 attempts
per five minutes. Account lockout occurs after five failed sign-in attempts for
15 minutes by default.

---

## Browser security and deployment

The current flow gives browser JavaScript access to a refresh token because the
API does not yet issue an HttpOnly cookie. This is an interim first-party portal
contract, not a reason to weaken browser protections.

- Use HTTPS outside Development. The API refuses OAuth token issuance over HTTP.
- Configure `Cors:AllowedOrigins` with the exact portal origin. For example,
  `Cors__AllowedOrigins__0=https://admin.isigroup.com.kh`. Do not use `*`.
- Do not send `credentials: 'include'`; authentication is the bearer header, not
  a cookie.
- Keep the access token in memory. Prefer `sessionStorage` over `localStorage`
  for a refresh token if reload persistence is required; clear it on logout and
  when refresh fails.
- Do not expose tokens in URLs, logs, error reports, analytics events, Redux
  persistence, or browser extensions.
- Enforce a strict Content Security Policy and avoid unsafe inline scripts. An
  XSS vulnerability can read any token available to JavaScript.
- Never ship an OAuth client secret in the React bundle. The current JSON route
  uses the registered first-party public client internally.

---

## React reference implementation

The following compact client shows the required response shapes and refresh
serialization. Replace the storage wrapper with the portal's established state
management and error handling.

```ts
type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

class AuthApi {
  private accessToken?: string;
  private refreshInFlight?: Promise<void>;
  private readonly apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  async signIn(employeeId: string, password: string, deviceId: string) {
    const tokens = await this.post<TokenPair>('/auth/login', {
      employeeId, password,
      deviceId, deviceName: navigator.userAgent, platform: 'Web'
    });
    this.setTokens(tokens);
    return this.get('/auth/me');
  }

  async fetch(input: string, init: RequestInit = {}) {
    let response = await this.authorizedFetch(input, init);
    if (response.status !== 401) return response;

    await this.refreshOnce();
    response = await this.authorizedFetch(input, init); // retry exactly once
    return response;
  }

  private async refreshOnce() {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.post<TokenPair>('/auth/refresh', {
        refreshToken: sessionStorage.getItem('isi.refreshToken')
      }).then(tokens => this.setTokens(tokens)).finally(() => {
        this.refreshInFlight = undefined;
      });
    }
    await this.refreshInFlight;
  }

  private setTokens(tokens: TokenPair) {
    this.accessToken = tokens.access_token;
    sessionStorage.setItem('isi.refreshToken', tokens.refresh_token);
  }

  private authorizedFetch(path: string, init: RequestInit) {
    return fetch(`${this.apiBaseUrl}/api/v1${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${this.accessToken}` }
    });
  }

  private async get(path: string) {
    const response = await this.fetch(path);
    if (!response.ok) throw await response.json();
    return response.json();
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw await response.json();
    return response.json() as Promise<T>;
  }
}
```

On a failed refresh, the production implementation should clear both tokens,
clear the cached `/auth/me` result, and redirect to sign-in. It must not retry a
login or refresh automatically with credentials the user has not explicitly
submitted.

For the server model and lifecycle rationale, see [Authentication](Authentication.md).
