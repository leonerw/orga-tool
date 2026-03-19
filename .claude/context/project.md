# Project Context

## Overview

Orga-Tool is an expandable personal dashboard application built for a single user (or small teams). It provides a modular widget-based interface where features — todos, calendar, notes, shopping lists, etc. — can be added over time as self-contained modules. The backend is a REST API served by Express/Node.js with MongoDB, and the frontend is a React/TypeScript SPA built with Vite.

## Tech Stack

- **Language:** TypeScript (frontend), JavaScript ESM (backend)
- **Frontend Framework:** React 19, React Router 7, Vite 7
- **Backend Framework:** Express 4, Node.js >= 18
- **Database:** MongoDB via Mongoose 8
- **Styling:** TailwindCSS 4 (Vite plugin), Radix UI primitives
- **Auth:** JWT access tokens + refresh tokens (httpOnly cookies), bcryptjs, Node.js `crypto`
- **Forms:** react-hook-form
- **Dashboard Layout:** react-grid-layout
- **HTTP Client:** Axios (with global 401-interceptor for silent token refresh)
- **Testing:** Vitest, supertest, mongodb-memory-server (backend); no frontend tests yet
- **CI/CD:** GitHub Actions — runs backend + frontend tests, then build
- **Tooling:** ESLint, nodemon, concurrently (monorepo dev runner)
- **Monorepo:** npm workspaces (`backend/`, `frontend/`)

## Goals & Constraints

- **Primary goal:** Build an extensible personal organizer dashboard. Features are added incrementally as isolated modules. The widget system must allow easy plug-in of new feature widgets to the dashboard.
- **Hard constraints:**
  - New features must not break existing authentication or routing patterns
  - Backend routes for protected resources must always go through `requireAuth` middleware
  - Todo ownership must always be enforced at the DB query level (never trust client-provided owner IDs)
  - Refresh token rotation must always revoke the previous session on refresh
- **Non-goals:**
  - Multi-tenant / team collaboration (not currently in scope)
  - Native mobile app (planned eventually, not now)
  - Public-facing API (internal use only)

## Current Status

- **Phase:** Early development — authentication and first feature (todos) complete
- **What's done:**
  - Full JWT + refresh-token auth system with remember-me, session rotation, and 401 auto-retry
  - User registration and login pages
  - Todo CRUD (create, read, update, delete) — backend + frontend
  - Dashboard page with react-grid-layout widget grid
  - TodoWidget and TestWidget on dashboard
  - Navbar with theme toggle and user dropdown
  - Dark/light mode (class-based, localStorage-persisted)
  - GitHub Actions CI pipeline
- **What's next (planned features):**
  - Calendar widget/page
  - Notes widget/page
  - Shopping list widget/page
  - Mobile app (long-term)
