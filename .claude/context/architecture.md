# Architecture Decisions

## Structure

```
orga-tool/                          # npm workspaces monorepo
├── backend/                        # Express REST API
│   └── src/
│       ├── main.js                 # Entry: loads env, connects DB, starts server
│       ├── app.js                  # createApp() factory — CORS, middleware, routes
│       ├── config/db.js            # Mongoose connection
│       ├── models/                 # Mongoose schemas
│       │   ├── user.model.js
│       │   ├── todo.model.js
│       │   └── auth-session.model.js
│       ├── controllers/            # Business logic
│       │   ├── auth.controller.js
│       │   └── todo.controller.js
│       ├── routes/                 # Express routers
│       │   ├── auth.routes.js      # POST /api/auth/*
│       │   └── todo.routes.js      # /api/todos/* (protected)
│       ├── middleware/
│       │   └── require-auth.js     # JWT Bearer token guard → sets req.auth
│       └── utils/
│           ├── auth.js             # bcrypt, JWT sign/verify, refresh token helpers
│           └── auth-cookie.js      # Set/clear httpOnly refresh token cookie
│
├── frontend/                       # React 19 + TypeScript SPA
│   └── src/
│       ├── app/                    # App shell
│       │   ├── main.tsx            # React root (wraps with AuthProvider)
│       │   ├── router.tsx          # React Router 7 route definitions
│       │   └── layout/MainLayout.tsx  # ThemeProvider + Navbar + Outlet
│       ├── auth/                   # Auth feature slice
│       │   ├── api/auth.ts         # API calls (register, login, refresh, logout, me)
│       │   ├── context/            # AuthContext, AuthProvider, useAuth hook
│       │   ├── components/RequireAuth.tsx  # Route guard
│       │   ├── pages/              # LoginPage, RegisterPage
│       │   └── types/auth.ts       # AuthUser, LoginPayload, RegisterPayload
│       ├── features/               # Feature modules (one folder per feature)
│       │   ├── dashboard/pages/DashboardPage.tsx
│       │   ├── todos/              # api/, components/, hooks/, pages/, types/
│       │   └── testfeature/        # Placeholder widget example
│       ├── components/             # Shared UI components
│       │   ├── layout/             # Navbar, WidgetLayout
│       │   ├── themes/             # ThemeProvider, ModeToggle
│       │   └── ui/                 # Radix UI + Tailwind primitives
│       └── services/api.ts         # Axios instance + setAccessToken()
│
└── .claude/                        # AI agent context and personas
    ├── CLAUDE.md                   # Master orchestrator instructions
    ├── agents/                     # Specialized agent personas
    ├── commands/                   # Slash command implementations
    └── context/                    # This folder — project context files
```

## Key Decisions

### ADR-001: Monorepo with npm workspaces

**Status:** Accepted
**Decision:** Frontend and backend live in the same repo under `frontend/` and `backend/` directories, managed with npm workspaces and `concurrently` for development.
**Rationale:** Keeps related code together, simplifies CI, and allows shared type definitions in future if needed.
**Consequences:** Single `npm run dev` from root starts both servers. All CI steps run from root workspace.

---

### ADR-002: JWT access tokens + httpOnly cookie refresh tokens

**Status:** Accepted
**Decision:** Access tokens are short-lived JWTs (15 min default) sent in-memory and via `Authorization: Bearer` headers. Refresh tokens are random 64-byte hex strings stored as SHA-256 hashes in `AuthSession` documents, delivered via httpOnly cookies scoped to `/api/auth`.
**Rationale:** Prevents XSS from stealing refresh tokens (httpOnly). DB-stored sessions allow revocation. Token rotation prevents replay attacks.
**Consequences:** Backend must query DB on every refresh. Sessions must be cleaned up via MongoDB TTL index on `expiresAt`.

---

### ADR-003: Refresh token rotation

**Status:** Accepted
**Decision:** On every `/api/auth/refresh` call, the old `AuthSession` is marked `revokedAt` (soft-deleted) and a new session with a new refresh token is created.
**Rationale:** Prevents refresh token replay. If an old token is used, it's already revoked, triggering a 401.
**Consequences:** Each refresh creates a new DB document. Old documents are cleaned up by TTL index.

---

### ADR-004: Remember-me with variable TTL

**Status:** Accepted
**Decision:** Login accepts `rememberMe: boolean`. If true, refresh TTL is 30 days; otherwise 1 day (session).
**Rationale:** Standard UX pattern for persistent vs. session-scoped login.
**Consequences:** TTL values are stored in `.env` as `REFRESH_TOKEN_TTL_REMEMBER_DAYS` and `REFRESH_TOKEN_TTL_SESSION_DAYS`.

---

### ADR-005: Global Axios 401 interceptor with silent refresh

**Status:** Accepted
**Decision:** `AuthProvider` installs an Axios response interceptor. On 401 from any non-auth endpoint, it calls `refreshSession()`, updates the access token, and retries the original request once.
**Rationale:** Access tokens expire frequently (15 min). Manual refresh handling in every API call would be duplicated and error-prone.
**Consequences:** Auth endpoints must be excluded from retry logic to prevent infinite loops. A shared `sharedRefreshPromise` deduplicates concurrent refresh attempts.

---

### ADR-006: Feature slice folder structure

**Status:** Accepted
**Decision:** Each feature lives in `frontend/src/features/<feature-name>/` with subfolders: `api/`, `components/`, `hooks/`, `pages/`, `types/`.
**Rationale:** Co-locates all code for a feature, making it easy to add, remove, or reason about features independently.
**Consequences:** New features follow this exact layout. Shared/cross-feature code lives in `src/components/` or `src/services/`.

---

### ADR-007: Widget-based dashboard with react-grid-layout

**Status:** Accepted
**Decision:** The dashboard uses `react-grid-layout` with a 6-column, 110px row-height grid. Each feature exposes a widget component wrapped in `WidgetLayout`. Layout is defined statically in `DashboardPage`.
**Rationale:** Provides drag-and-drop resizable widget layout with minimal setup.
**Consequences:** New features add their widget to the `layouts` array and render it in `DashboardPage`. Widget dimensions and positions are currently hardcoded.

---

### ADR-008: Ownership enforced at DB query level

**Status:** Accepted
**Decision:** All todo queries include `{ owner: req.auth.userId }` in the filter. No separate ownership check after fetch.
**Rationale:** Prevents information leakage and simplifies controller logic — a not-found and unauthorized look the same to the client.
**Consequences:** Any new resource type that is user-owned must follow the same pattern: filter by owner at query time, never fetch-then-check.

## Integration Points

- **MongoDB:** Local instance in development (`mongodb://localhost:27017/orga-tool`). TTL index on `AuthSession.expiresAt` handles session cleanup automatically.
- **GitHub Actions:** CI runs backend tests (Vitest + mongodb-memory-server), frontend tests (none yet), then frontend build (`tsc -b && vite build`).
- **Environment Variables:**
  - Backend: `PORT`, `MONGO_URI`, `FRONTEND_URL`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_REMEMBER_DAYS`, `REFRESH_TOKEN_TTL_SESSION_DAYS`, `NODE_ENV`
  - Frontend: `VITE_API_URL`
