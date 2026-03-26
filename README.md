# Orga Tool

A personal learning project built to practice full-stack web development following real-world best practices — covering auth, API design, frontend architecture, testing, and CI/CD.

The app itself is a modular personal dashboard. Features are added incrementally as self-contained modules — todos, calendar, notes, shopping lists, and more.

## Features

| Status | Feature |
|:------:|---------|
| Done | Authentication — register, login, logout, remember-me |
| Done | Two-factor authentication (TOTP) |
| Done | Email verification & password change |
| Done | Todo CRUD (create, read, update, delete) |
| Done | Dashboard with drag-and-drop widget grid |
| Done | Dark / light mode |
| WIP | — |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, React Router 7 |
| Styling | TailwindCSS 4, Radix UI primitives |
| Backend | Node.js ≥ 18, Express 4, JavaScript ESM |
| Database | MongoDB via Mongoose 8 |
| Auth | JWT access tokens + httpOnly refresh token cookies, bcryptjs, TOTP (otpauth), Nodemailer |
| Forms | react-hook-form |
| Dashboard | react-grid-layout |
| HTTP Client | Axios (global 401 interceptor for silent token refresh) |
| Testing | Vitest, supertest, mongodb-memory-server |
| CI/CD | GitHub Actions |

## Project Structure

```
orga-tool/                          # npm workspaces monorepo
├── backend/
│   └── src/
│       ├── main.js                 # Entry point
│       ├── app.js                  # Express app factory
│       ├── config/db.js            # Mongoose connection
│       ├── models/                 # Mongoose schemas
│       ├── controllers/            # Business logic
│       ├── routes/                 # Express routers
│       ├── middleware/
│       │   └── require-auth.js     # JWT auth guard
│       └── utils/                  # Auth helpers, cookie helpers
│
└── frontend/
    └── src/
        ├── app/                    # App shell (router, layout, entry)
        ├── auth/                   # Auth feature slice (context, pages, API)
        ├── features/               # Feature modules (one folder per feature)
        │   ├── dashboard/
        │   └── todos/
        ├── components/             # Shared UI (Navbar, WidgetLayout, Radix primitives)
        └── services/api.ts         # Global Axios instance
```

## Setup

### Prerequisites

- Node.js ≥ 18
- MongoDB (local instance or Atlas)

### 1. Clone and install

```bash
git clone https://github.com/leonerw/orga-tool.git
cd orga-tool
npm install
```

### 2. Configure environment variables

**`backend/.env`**

```env
PORT=8080
MONGO_URI=mongodb://localhost:27017/orga-tool
FRONTEND_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_secret_here
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_REMEMBER_DAYS=30
REFRESH_TOKEN_TTL_SESSION_DAYS=1
NODE_ENV=development

EMAIL_VERIFY_SECRET=your_email_verify_secret_here
TWO_FACTOR_PENDING_SECRET=your_2fa_pending_secret_here

# Brevo SMTP — get credentials from brevo.com → SMTP & API → SMTP
BREVO_SMTP_USER=your_brevo_smtp_user
BREVO_SMTP_PASS=your_brevo_smtp_pass
EMAIL_FROM=your_email@example.com
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:8080
```

### 3. Start development servers

```bash
npm run dev
```

This starts both the backend (default port 8080) and the frontend (default port 5173) concurrently.

## Testing

```bash
# Run backend tests
npm test --workspace=backend

# Run with coverage
npm run test:coverage --workspace=backend
```

CI runs automatically on push and pull requests to `main` via GitHub Actions.

## Auth System

- **Access tokens:** Short-lived JWTs (15 min), sent via `Authorization: Bearer` header.
- **Refresh tokens:** Random 64-byte hex strings stored as SHA-256 hashes in MongoDB, delivered via httpOnly cookies scoped to `/api/auth`.
- **Token rotation:** Every refresh revokes the old session and issues a new one.
- **Remember-me:** Controls refresh token TTL (30 days vs. 1 day).
- **2FA:** TOTP-based via `otpauth`. QR code provisioning on setup.
- **Email verification:** Verification link sent on registration via Nodemailer.
- **Silent refresh:** Axios interceptor automatically retries failed requests after refreshing the access token.
