# ERSMS Security Architecture & Policy

## 1. Authentication Security

### 1.1 Password Storage & Cryptographic Hashing
- Passwords are encrypted using **Argon2id** (configured with memory cost >= 64MB, iterations >= 3, parallelism >= 1), or high-work-factor `bcryptjs` (salt rounds = 12) when native bindings are unavailable.
- Passwords are never stored or logged in plain text.
- Minimum password requirements: 8+ characters, containing uppercase, lowercase, numbers, and special characters.

### 1.2 JWT Token Strategy & Session Design
- **Access Tokens**: Short-lived (15 minutes), signed with `JWT_SECRET` (HMAC SHA-256). Transmitted in the HTTP `Authorization: Bearer <token>` header or secure cookie.
- **Refresh Tokens**: Long-lived (7 days), stored in MongoDB hashed with SHA-256 (`tokenHash`). Delivered via `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`/api/v1/auth`).
- **Token Rotation & Reuse Detection**: Each refresh operation invalidates the existing refresh token and generates a new token pair. If a revoked or consumed refresh token is presented, the system treats it as token theft and invalidates all active sessions for that user immediately.
- **Multi-Device Session Governance**:
  - Authenticated users can query their active session count via `GET /api/v1/auth/me`.
  - Self-service session revocation via `POST /api/v1/auth/revoke-sessions` (invalidates all other devices while preserving the current login).
  - Administrative session revocation via `POST /api/v1/users/:id/revoke-sessions` (terminates all active sessions for a target user).

### 1.3 Single-Company Provisioning & Initial Administrator Bootstrap
ERSMS operates as an internal single-company platform where self-registration by the public is strictly prohibited in production.
- **Initial Administrator Bootstrap**:
  - When the database contains zero users (`User.countDocuments() === 0`), the very first request to `POST /api/v1/auth/register` automatically provisions the primary `SUPER_ADMIN` account.
  - Immediately following this bootstrap event, public self-registration is permanently disabled.
- **Enterprise Provisioning**:
  - All subsequent employee accounts must be provisioned by authenticated administrators via `POST /api/v1/users`.
  - In automated test and local development environments, public registration can be toggled via `ALLOW_PUBLIC_REGISTRATION=true`.
- **Seed Script Provisioning**:
  - Running `npm run seed --workspace=server` initializes predefined synthetic accounts (`superadmin@enterprise.internal`, `admin@enterprise.internal`, `pm@enterprise.internal`, `engineer@enterprise.internal`) with cryptographically hashed passwords.

### 1.4 Password Reset Flow with Expiring Cryptographic Tokens
- **Requesting Reset (`POST /api/v1/auth/forgot-password`)**:
  - Generates a 32-byte cryptographically secure random token (`crypto.randomBytes(32)`).
  - The token is hashed via SHA-256 before being stored in `passwordResetTokenHash` with a strict 1-hour expiration timestamp (`passwordResetExpiresAt`).
  - To prevent email enumeration attacks, requests always return a uniform generic success message.
  - Audit event `PASSWORD_RESET_REQUESTED` is recorded.
- **Executing Reset (`POST /api/v1/auth/reset-password`)**:
  - Computes the SHA-256 digest of the incoming token and looks up the matching active user where `passwordResetExpiresAt > Date.now()`.
  - If invalid or expired, the request is immediately rejected with HTTP 400.
  - Validates new password complexity against enterprise rules.
  - Re-hashes the password, clears the reset token fields, and invalidates all active refresh tokens (forcing re-authentication across all devices).
  - Audit event `PASSWORD_RESET_SUCCESS` is recorded.

---

## 2. Authorization & RBAC

### 2.1 Role Hierarchy
All backend endpoints enforce explicit role-based access checks:
1. `SUPER_ADMIN`: Root privileges, audit trail inspection, user activation/deactivation, tenant settings.
2. `ADMIN`: Resource, subscription, expense, project, and staff allocation management.
3. `PROJECT_MANAGER`: Resource assignment, project budget tracking, project-level expense registration.
4. `EMPLOYEE`: Read-only access to assigned assets, individual notifications, personal profile.

### 2.2 Prevention of Role Elevation
- Users updating their own profiles via `PUT /api/v1/auth/profile` are restricted to `name` and `department`. Incoming `role` and `isActive` attributes are completely stripped.
- In `PUT /api/v1/users/:id`, role modifications require `SUPER_ADMIN` authority. Any attempt by a non-Super Admin or user modifying their own role is rejected with HTTP 403 Forbidden.
- The system prevents demoting the last active Super Administrator.

### 2.3 Immediate Deactivation & Enforcement on Every Request
- Accounts deactivated via `PATCH /api/v1/users/:id/status` immediately have all refresh tokens purged.
- The authentication middleware (`authenticate`) inspects `user.isActive` directly from the database on every request. Even if an access token remains unexpired, requests from deactivated users are rejected with HTTP 403 Forbidden.

### 2.4 Project & Digital Resource Access Policies
- Super Admins and Admins have global visibility and management authority across all projects and resources.
- Project Managers have management authority over projects where `project.leadId === user._id` and visibility over resources allocated to their projects.
- Regular Employees have read-only visibility restricted to projects and resources where they are actively allocated (`ResourceAllocation.assignedEmployeeId === user._id`).

---

## 3. Defense-in-Depth Mechanisms

### 3.1 Injection Defense
- **NoSQL Injection**: Express middleware strips and sanitizes incoming keys starting with `$` or containing `.`. Mongoose strict schemas prevent unsanctioned attributes.
- **Cross-Site Scripting (XSS)**: Inputs are validated against strict Zod schemas; output strings are safely escaped by React's JSX engine.
- **HTTP Security Headers**: `helmet()` provides HSTS, CSP headers, `X-Content-Type-Options: nosniff`, and Frameguard (clickjacking defense).

### 3.2 Rate Limiting
- **Authentication**: Strict rate limiting on `/api/v1/auth/login`, `/api/v1/auth/forgot-password`, and `/api/v1/auth/reset-password` (maximum 15 attempts per 15-minute window per IP) via `authRateLimiter`.
- **Global API**: General rate limiter prevents DoS attacks across all `/api/v1/*` routes (maximum 300 requests per 15 minutes).

### 3.3 CSRF Protection
- Refresh cookies are configured with `SameSite=Strict` (production) / `Lax` (dev) and `HttpOnly`, isolating them from cross-origin requests.
- Mutating state via API requires `Content-Type: application/json` and standard Authorization bearer verification.

### 3.4 Sensitive Data Protection
- Secrets, database passwords, and third-party connector tokens are loaded strictly via environment variables.
- Structured logger (Pino) sanitizes and masks sensitive fields (`password`, `authorization`, `token`, `secret`, `cookie`).
- Financial audit logs cannot be modified or deleted through the API interface.
