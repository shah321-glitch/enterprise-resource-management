# ERSMS Security Architecture & Policy

## 1. Authentication Security

### 1.1 Password Storage
- Passwords are encrypted using **Argon2id** (configured with memory cost >= 64MB, iterations >= 3, parallelism >= 1), or high-work-factor bcryptjs fallback when native bindings are unavailable.
- Passwords are never stored or logged in plain text.
- Minimum password requirements: 8+ characters, containing uppercase, lowercase, numbers, and special characters.

### 1.2 JWT Token Strategy
- **Access Tokens**: Short-lived (15 minutes), signed with `JWT_SECRET` (HMAC SHA-256 or RSA). Transmitted in the HTTP `Authorization: Bearer <token>` header or Secure cookie.
- **Refresh Tokens**: Long-lived (7 days), stored in MongoDB hashed with SHA-256. Delivered via `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`/api/v1/auth`).
- **Token Rotation & Reuse Detection**: Each refresh operation invalidates the existing refresh token and generates a new token pair. If a revoked or consumed refresh token is presented, the system treats it as token theft and invalidates all active sessions for that user immediately.

---

## 2. Authorization & RBAC

All backend endpoints enforce explicit role-based access checks:
1. `SUPER_ADMIN`: Root privileges, audit trail inspection, user activation/deactivation, tenant settings.
2. `ADMIN`: Resource, subscription, expense, project, and staff allocation management.
3. `PROJECT_MANAGER`: Resource assignment, project budget tracking, project-level expense registration.
4. `EMPLOYEE`: Read-only access to assigned assets, individual notifications, personal profile.

Backend checks use the `requireRole(['ADMIN', 'SUPER_ADMIN'])` middleware. Frontend UI elements (e.g. edit/delete buttons) are conditionally rendered for UX but backend endpoints perform independent validation.

---

## 3. Defense-in-Depth Mechanisms

### 3.1 Injection Defense
- **NoSQL Injection**: Express middleware strips and sanitizes incoming keys starting with `$` or containing `.`. Mongoose strict schemas prevent unsanctioned attributes.
- **Cross-Site Scripting (XSS)**: Inputs are validated against strict Zod schemas; output strings are safely escaped by React's JSX engine.
- **HTTP Security Headers**: `helmet()` provides HSTS, CSP headers, X-Content-Type-Options: nosniff, and Frameguard (clickjacking defense).

### 3.2 Rate Limiting
- **Authentication**: Strict rate limiting on `/api/v1/auth/login` (e.g., maximum 5 attempts per 15-minute window per IP) using `express-rate-limit`.
- **Global API**: General rate limiter prevents DoS attacks across all `/api/v1/*` routes (e.g., 300 requests per 15 minutes).

### 3.3 CSRF Protection
- Refresh cookies are configured with `SameSite=Strict` and `HttpOnly`, isolating them from cross-origin requests.
- Mutating state via API requires `Content-Type: application/json` and standard Authorization bearer verification or anti-CSRF token headers.

### 3.4 Sensitive Data Protection
- Secrets, database passwords, and third-party connector tokens are loaded strictly via environment variables.
- Structured logger (Pino) sanitizes and masks sensitive fields (`password`, `authorization`, `token`, `secret`, `cookie`).
- Financial audit logs cannot be modified or deleted through the API interface.

