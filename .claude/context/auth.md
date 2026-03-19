# Authentication System

## Overview

The auth system uses short-lived JWT access tokens paired with long-lived refresh tokens stored in an httpOnly cookie. Sessions are tracked in MongoDB so they can be revoked. The frontend bootstraps silently on load and retries failed requests transparently.

---

## Token Flow

### Login / Register
1. Client sends credentials to `POST /api/auth/login` or `/register`
2. Backend validates credentials, creates an `AuthSession` document, and sets a `refreshToken` httpOnly cookie
3. Response body contains `{ accessToken, user }`
4. Frontend stores `accessToken` in memory (React state) and sets it as the default Axios `Authorization` header via `setAccessToken()`

### Authenticated Requests
- Every request includes `Authorization: Bearer <accessToken>` (set globally on the Axios instance)
- The `requireAuth` middleware verifies the JWT and sets `req.auth = { userId, email }`

### Token Refresh
- Access tokens expire after 15 minutes (`ACCESS_TOKEN_TTL` env var)
- On a 401 response, the Axios interceptor in `AuthProvider` calls `POST /api/auth/refresh`
- Backend validates the refresh token cookie, revokes the old `AuthSession`, creates a new one, and returns a new `{ accessToken, user }`
- The interceptor retries the original request with the new token
- Concurrent 401s are deduplicated via `sharedRefreshPromise` (module-level singleton)

### Bootstrap (page load)
- `AuthProvider` calls `refreshSessionOnce()` on mount
- If a valid refresh cookie exists, the user is silently logged in
- `isBootstrapping` is `true` until this resolves; `RequireAuth` shows a loading state during this window

### Logout
1. Client calls `POST /api/auth/logout`
2. Backend revokes the `AuthSession` and clears the cookie
3. Frontend clears user state and the Axios `Authorization` header regardless of API success

---

## Session Model (`AuthSession`)

| Field              | Type      | Purpose                                           |
|--------------------|-----------|---------------------------------------------------|
| `userId`           | ObjectId  | Links session to a user                           |
| `refreshTokenHash` | String    | SHA-256 hash of the raw refresh token (never stored raw) |
| `expiresAt`        | Date      | Hard expiry — also drives MongoDB TTL index cleanup |
| `revokedAt`        | Date/null | Set on rotation or logout; null = active session  |
| `rememberMe`       | Boolean   | Preserved across rotations to maintain original TTL |
| `userAgent`        | String    | Recorded for audit/debug; not used for validation |
| `ip`               | String    | Recorded for audit/debug; not used for validation |

A session is valid only when `revokedAt` is null **and** `expiresAt` is in the future. The MongoDB TTL index deletes expired documents automatically (runs ~60s interval — the `expiresAt` check in the controller is the authoritative guard, not the index).

---

## Refresh Token Rotation

On every `/api/auth/refresh`:
1. Old session is found by `{ refreshTokenHash, revokedAt: null }`
2. `expiresAt` is checked — if expired, session is revoked and 401 returned
3. Old session is marked `revokedAt = now`
4. New session is created with the **same `expiresAt`** from the old session (`fixedExpiresAt`) — rotation does not extend lifetime
5. New refresh token cookie is set with `maxAge` calculated from the remaining time

---

## Remember-Me

| Mode        | Refresh TTL env var                      | Default |
|-------------|------------------------------------------|---------|
| Remember me | `REFRESH_TOKEN_TTL_REMEMBER_DAYS`        | 30 days |
| Session     | `REFRESH_TOKEN_TTL_SESSION_DAYS`         | 1 day   |

The `rememberMe` flag is stored on the session document and carried forward on each rotation.

---

## Cookie Settings

Cookie name: `refreshToken` — scoped to `path: /api/auth`

| Setting    | Development  | Production   |
|------------|--------------|--------------|
| `httpOnly` | true         | true         |
| `secure`   | false        | true         |
| `sameSite` | `"lax"`      | `"none"`     |

`sameSite: "none"` requires `secure: true`, so this pair only activates in production. Development uses `lax` to allow the cross-port setup (`:5173` frontend → `:8080` backend).

---

## Backend File Map

| File | Responsibility |
|------|---------------|
| `middleware/require-auth.js` | Verifies Bearer JWT, sets `req.auth` |
| `controllers/auth.controller.js` | Register, login, refresh, logout, me handlers |
| `utils/auth.js` | bcrypt, JWT sign/verify, refresh token generation and hashing |
| `utils/auth-cookie.js` | `setRefreshTokenCookie` / `clearRefreshTokenCookie` helpers |
| `models/auth-session.model.js` | Mongoose schema with TTL index |
| `models/user.model.js` | User schema — stores `passwordHash`, never plain password |
| `routes/auth.routes.js` | Mounts at `/api/auth/*`; `/me` is protected by `requireAuth` |

---

## Frontend File Map

| File | Responsibility |
|------|---------------|
| `services/api.ts` | Axios instance with `withCredentials: true`; `setAccessToken()` sets/clears `Authorization` header |
| `auth/api/auth.ts` | Thin wrappers: `register`, `login`, `refreshSession`, `logout`, `me` |
| `auth/context/AuthProvider.tsx` | Owns auth state; installs 401 interceptor; bootstraps on mount |
| `auth/context/AuthContext.ts` | Context type definition |
| `auth/context/useAuth.ts` | Typed hook to consume context |
| `auth/components/RequireAuth.tsx` | Route guard — shows loading during bootstrap, redirects to `/login` if unauthenticated |
| `auth/types/auth.ts` | `AuthUser`, `AuthResponse`, `LoginPayload`, `RegisterPayload` |

---

## Key Rules

- **Never** add manual JWT parsing to a controller — always use `requireAuth` middleware
- **Never** store the refresh token in localStorage or any JS-accessible variable — httpOnly cookie only
- **Never** bypass ownership checks — all user-owned resources must filter by `req.auth.userId` at the DB query level
- **Always** use `createSessionAndTokens()` when issuing new tokens — do not call cookie helpers or JWT utils directly from controllers
- **Always** use `requireAuth` on any route that accesses user data
- The 401 interceptor handles retry automatically — feature API modules must not implement their own refresh logic
