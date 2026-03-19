# Code Conventions

## Naming

### General
- **Files:** `kebab-case` everywhere — `auth.controller.js`, `require-auth.js`, `todo.model.js`
- **React component files:** `PascalCase.tsx` — `TodoForm.tsx`, `LoginPage.tsx`, `MainLayout.tsx`
- **Variables/functions:** `camelCase` in both JS and TS
- **Types/interfaces:** `PascalCase` — `AuthUser`, `LoginPayload`, `Todo`
- **Constants:** `SCREAMING_SNAKE_CASE` only for env variable names in config

### Backend
- Controllers: `<resource>.controller.js` — exported as named functions (not classes)
- Routes: `<resource>.routes.js` — exports a single Express `Router`
- Models: `<resource>.model.js` — exports the Mongoose model as default
- Middleware: descriptive verb — `require-auth.js`
- Utils: grouped by concern — `auth.js` (crypto/JWT), `auth-cookie.js` (cookie helpers)

### Frontend
- Pages: `<Name>Page.tsx` inside `features/<feature>/pages/`
- Widgets: `<Name>Widget.tsx` inside `features/<feature>/components/`
- Hooks: `use<Name>.ts` inside `features/<feature>/hooks/` or `auth/context/`
- API modules: `<resource>.ts` inside `features/<feature>/api/` or `auth/api/`
- Types: `<resource>.ts` inside `features/<feature>/types/` or `auth/types/`
- Shared UI: `src/components/ui/` for Radix-based primitives

## File & Folder Organization

### Backend: add a new resource
1. Create `src/models/<resource>.model.js`
2. Create `src/controllers/<resource>.controller.js`
3. Create `src/routes/<resource>.routes.js`
4. Mount route in `src/app.js` — protect with `requireAuth` if user-owned data

### Frontend: add a new feature
1. Create `src/features/<feature-name>/` with subfolders: `api/`, `components/`, `hooks/`, `pages/`, `types/`
2. Add route in `src/app/router.tsx` — wrap in `<RequireAuth>` if auth-protected
3. Add widget component to `src/features/<feature-name>/components/<Name>Widget.tsx`
4. Register widget in `DashboardPage.tsx` layouts array

### Shared frontend code
- Cross-feature UI primitives → `src/components/ui/`
- Layout components (Navbar, WidgetLayout) → `src/components/layout/`
- Global Axios instance → `src/services/api.ts`
- Path alias `@/` maps to `src/` — use it for all imports

## Error Handling

### Backend
- Controllers return appropriate HTTP status codes directly: `res.status(400).json({ error: "..." })`
- Common pattern: early return on validation failure, proceed on success
- Auth errors always return `401` (never reveal whether user exists vs. wrong password where applicable)
- Mongoose validation errors and unknown `_id` formats are caught and return `400`
- No global error handler middleware — errors are handled per-controller

### Frontend
- API calls are wrapped in try/catch inside hooks (e.g., `useTodos`)
- Error state is stored in hook state and surfaced in the UI
- Auth errors (401) are handled by the global Axios interceptor in `AuthProvider` — they trigger a silent refresh + retry before surfacing to the caller
- Login/register pages catch errors from `AuthContext` and display them inline

## Testing

### Backend (Vitest + supertest + mongodb-memory-server)
- Test files live in `backend/test/`
- Naming: `<resource>.<type>.test.js` — e.g., `auth.api.test.js`, `todo.controller.test.js`
- Integration tests use supertest against the Express app and a real in-memory MongoDB instance
- Unit tests test individual controller functions or utils in isolation
- Run: `npm test --workspace=backend` | coverage: `npm run test:coverage --workspace=backend`
- `src/main.js` is excluded from coverage (entry point only)

### Frontend
- No frontend tests currently implemented
- CI runs `npm test --workspace=frontend --if-present` — passes because no test script exists yet

## Patterns to Follow

### Backend — creating sessions and tokens
Use the `createSessionAndTokens()` helper in `auth.controller.js`. Never manually create JWTs or write refresh token cookies outside this helper.

### Backend — protected routes
Always apply `requireAuth` middleware at the router level, not per-handler:
```javascript
// auth.routes.js or app.js
router.use(requireAuth);
```

### Backend — user-owned resources
Always filter by `owner: req.auth.userId` in the DB query itself:
```javascript
Todo.find({ _id: id, owner: req.auth.userId })
```

### Frontend — feature API module
Each feature has a dedicated `api/<resource>.ts` that imports the global `api` axios instance from `@/services/api`:
```typescript
import api from '@/services/api';
export const getTodos = () => api.get<Todo[]>('/todos').then(r => r.data);
```

### Frontend — feature data hook
Each feature encapsulates its data fetching in a `use<Feature>.ts` hook. The hook fetches on mount and exposes state + action functions. Pages consume the hook, not raw API calls.

### Frontend — dashboard widget
Every feature widget wraps its content in `<WidgetLayout title="..." ...>`:
```tsx
import WidgetLayout from '@/components/layout/WidgetLayout';
export function MyWidget() {
  return <WidgetLayout title="My Feature">...</WidgetLayout>;
}
```

### Frontend — auth-protected pages
Wrap route elements in `<RequireAuth>` in `router.tsx`. Never guard inside the page component itself.

### Frontend — form handling
Use `react-hook-form` with `Controller` for controlled Radix UI inputs. See `TodoForm.tsx` as the reference implementation.

## Patterns to Avoid

- **Do not** store the refresh token anywhere other than an httpOnly cookie. Never put it in localStorage, sessionStorage, or a JS variable.
- **Do not** put business logic in route files — routes only wire up middleware and controller functions.
- **Do not** fetch-then-check ownership. Always include the owner filter in the DB query (ADR-008).
- **Do not** add auth retry logic to individual API modules — the global interceptor in `AuthProvider` handles it.
- **Do not** import from `src/features/<other-feature>/` — features should not depend on each other. Shared code goes in `src/components/` or `src/services/`.
- **Do not** use `any` type in TypeScript without a comment explaining why.
- **Do not** skip `requireAuth` on routes that access user data, even for GET requests.
