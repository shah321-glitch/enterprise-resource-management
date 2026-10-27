# AGENTS.md: Development Conventions & Architectural Guidelines for ERSMS

Welcome to the **Enterprise Resource & Subscription Management System (ERSMS)** codebase. This document outlines project conventions, architectural invariants, business logic rules, security standards, and operational guidelines for AI coding agents and human engineers working on this repository.

---

## 1. Project Overview & Technology Stack

- **Purpose**: Single-company enterprise platform managing digital resources (cloud servers, SaaS accounts, domains, licenses), subscriptions, project resource allocations, API credits/quotas, expenses, automated renewal reminders, and business analytics.
- **Frontend**:
  - React 18+ with Vite (JavaScript ES modules, `"type": "module"`)
  - Styling: Tailwind CSS with shadcn/ui-compatible design primitives
  - State & Data Fetching: TanStack Query v5 + Context API for Auth & Theme
  - Routing: React Router v6
  - Forms & Validation: React Hook Form + Zod
  - Data Visualization: Recharts
  - Icons: Lucide React
  - Themes: Light & Dark theme support via CSS variables / Tailwind dark class
- **Backend**:
  - Node.js 24+ with Express (ES modules, `"type": "module"`)
  - Database: MongoDB with Mongoose ODM
  - API Architecture: RESTful under `/api/v1`
  - Validation: Zod request validation middleware
  - Logging: Pino structured JSON logger with `pino-http`
  - API Documentation: OpenAPI 3.0 / Swagger UI served at `/api/docs`
  - Authentication: Argon2id (with secure fallback) password hashing, JWT access token (15m) + secure refresh token rotation (7d)
  - Security: Helmet, CORS, Rate Limiting, Mongo Injection Sanitization, Centralized Error Handling
- **Testing**:
  - Vitest + React Testing Library (client)
  - Vitest + Supertest + `mongodb-memory-server` (server integration & unit testing)
- **Infrastructure**:
  - Docker & Docker Compose
  - GitHub Actions CI (`.github/workflows/ci.yml`)

---

## 2. Directory & Modular Organization

The repository uses npm workspaces with `server` and `client` directories:

```
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/         # Reusable UI primitives (Button, Input, Modal, Table, etc.)
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── features/           # Feature-based modular structure
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── resources/
│   │   │   ├── projects/
│   │   │   ├── allocations/
│   │   │   ├── subscriptions/
│   │   │   ├── api-credits/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── users/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── hooks/              # Custom reusable hooks
│   │   ├── lib/                # API client (Axios/fetch with interceptors), utils
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/             # Environment, db, pino logger config
│   │   ├── middleware/         # Auth, RBAC, validate, rateLimiter, errorHandler, audit
│   │   ├── modules/            # Feature modules (controller, service, model, routes, schema)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── resources/
│   │   │   ├── projects/
│   │   │   ├── allocations/
│   │   │   ├── subscriptions/
│   │   │   ├── api-credits/
│   │   │   ├── connectors/     # Provider Integration Framework
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── audit-logs/
│   │   ├── cron/               # Scheduled background jobs (renewals, syncs)
│   │   ├── utils/              # Currency helper, errors, formatters
│   │   ├── app.js              # Express app setup & middleware
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Integration and unit tests
│   ├── package.json
│   └── vitest.config.js
│
├── docs/                       # Architecture, database design, API specs, security, status
├── Dockerfile.client
├── Dockerfile.server
├── docker-compose.yml
└── package.json
```

---

## 3. Core Business & Financial Invariants

1. **Monetary Representation**:
   - Store all monetary values as integer minor units (e.g., cents, $10.50 = `1050`) or precise decimal objects to eliminate floating-point rounding errors.
   - Always store the three-letter ISO 4217 currency code (e.g., `USD`, `EUR`, `GBP`).
   - Never combine or sum amounts of different currencies without explicit multi-currency exchange rate conversion.

2. **Expenses vs. Forecasts**:
   - Actual paid expenses (`expenses` collection) are strictly distinct from recurring subscription cost forecasts.
   - Never record a subscription renewal as an actual expense automatically unless an official payment record/invoice exists or confirmed by the payment workflow.
   - Historical financial records must never be destructively overwritten.

3. **API Credit & Quota Isolation**:
   - Never treat monetary balance (USD), request quota (HTTP requests), token quota (LLM tokens), or provider-specific units as interchangeable.
   - The credit model enum must be strictly enforced: `MONETARY`, `REQUEST_QUOTA`, `TOKEN_QUOTA`, `UNIT_QUOTA`.

4. **Resource Allocation Safety**:
   - Supported allocation types: `EQUAL`, `PERCENTAGE`, `FIXED_AMOUNT`, `USAGE_BASED`.
   - The sum of active percentage allocations for a resource across projects must not exceed 100%.
   - Allocation records preserve start/end dates and historical transitions to avoid double-counting costs in historical reporting.

5. **Subscription Status & Renewals**:
   - Valid statuses: `ACTIVE`, `TRIAL`, `CANCELLED`, `EXPIRED`, `PENDING_RENEWAL`.
   - Cancelled subscriptions are never counted as active.
   - Renewal reminders are scheduled at configurable intervals: 30, 15, 7, and 1 day prior to `nextRenewalDate`.
   - Renewal processing is idempotent; duplicate renewals within the same billing cycle are rejected.

---

## 4. Security & Access Control (RBAC)

1. **Roles Hierarchy**:
   - `SUPER_ADMIN`: Full system access, tenant settings, user promotion/deactivation, raw audit log access.
   - `ADMIN`: Resource, subscription, project, user, and financial management.
   - `PROJECT_MANAGER`: Resource view/request, project-level allocations, project expenses, project API credit monitoring.
   - `EMPLOYEE`: Read-only access to assigned resources/projects, self profile, personal notifications.

2. **Authorization Enforcement**:
   - Authorization is strictly enforced in backend middleware (`requireRole`, `requirePermission`). Frontend guards are solely for user experience.
   - Passwords must be hashed using Argon2id with adequate memory and iteration parameters (or robust bcryptjs fallback).
   - JWT tokens: Short-lived access token (15 mins) transmitted via Authorization header or secure cookie; refresh token (7 days) stored as HttpOnly, Secure, SameSite=Strict cookie with database-backed token rotation and immediate invalidation upon reuse detection.
   - Sensitive audit logs: Every write/update to security, subscriptions, allocations, or expenses logs an immutable audit event (`actor`, `action`, `target`, `timestamp`, `metadata`). Audit logs cannot be modified or deleted via API.

---

## 5. Coding & Testing Standards

- **ES Modules**: Always use `import` / `export` syntax; no `require()` unless dynamic import is needed.
- **Service Layer**: Business logic lives in `*.service.js`. Controllers only handle HTTP request parsing, calling services, and returning structured JSON responses (`{ success: true, data: ... }` or `{ success: false, error: ... }`).
- **Validation**: All incoming requests (body, query, params) must be validated with Zod schemas before reaching the service layer.
- **Error Handling**: Use custom application errors extending `AppError` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`). Never leak stack traces to client in production.
- **Database Operations**: Use Mongoose schemas with compound indexes for common queries (e.g., `{ status: 1, nextRenewalDate: 1 }`).
- **Tests**: Every new module or fix must include integration tests covering success paths, validation errors, and authorization checks.
- **Provider Integrations**: Must inherit from the `BaseConnector` class and implement standard methods (`testConnection`, `getBalance`, `getUsage`, `getMetadata`). Live provider connections must never be simulated or claimed as successful without real network confirmation or explicit mock test status.

