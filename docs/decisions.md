# Architecture Decision Records (ADRs)

## ADR-001: Integer Minor Units for Monetary Representation
- **Status**: Accepted
- **Context**: Financial figures represented in floating-point types (`Number` in JavaScript/MongoDB) are vulnerable to binary floating-point representation errors (e.g. `0.1 + 0.2 !== 0.3`).
- **Decision**: All costs, expenses, budgets, and balances will be modeled as integer minor units (`cents`, e.g. `$49.99` is stored as `4999`) along with an explicit ISO 4217 currency identifier (e.g., `USD`).
- **Consequences**: Ensures exact penny precision across all aggregations, cost allocations, and reporting.

---

## ADR-002: Distinct Quota Models for API Credits
- **Status**: Accepted
- **Context**: API providers charge using varied metrics: direct dollar credits (OpenAI pre-paid, AWS credits), request counts (GitHub API, SendGrid), token counts (OpenAI, Anthropic tokens), or custom compute credits (Databricks, Snowflake).
- **Decision**: Define an explicit `creditModel` enumeration (`MONETARY`, `REQUEST_QUOTA`, `TOKEN_QUOTA`, `UNIT_QUOTA`). Quotas of different types are strictly isolated and never aggregated into a single numeric metric without distinct units.
- **Consequences**: Accurately reflects provider reality and eliminates false alerts or incorrect balance calculations.

---

## ADR-003: Strict Separation of Paid Expenses and Renewal Forecasts
- **Status**: Accepted
- **Context**: When a subscription passes its renewal date, automated systems often mistakenly count the projected renewal cost as an actual company expense before a payment transaction has occurred.
- **Decision**: Subscriptions model recurring commitments and forecast future liability. The `expenses` collection holds solely verified, actual payments. A renewal generates an expense only upon explicit payment confirmation or manual expense entry.
- **Consequences**: Accurate financial balance sheets and audit compliance.

---

## ADR-004: JWT Access Token with Database-Backed Refresh Rotation
- **Status**: Accepted
- **Context**: Stateless JWTs cannot be revoked if compromised before expiry. Full session cookies require database lookups on every single request.
- **Decision**: Hybrid approach:
  - 15-minute access token verified cryptographically without database lookup.
  - 7-day refresh token stored as HttpOnly, Secure, SameSite=Strict cookie, validated against a hash in the User document.
  - Refresh tokens are rotated upon each use; reuse of an expired/consumed token triggers immediate session revocation.
- **Consequences**: Fast request validation with real-time revocation capabilities.

---

## ADR-005: Modular Monolith with Provider Connector Interface
- **Status**: Accepted
- **Context**: Microservices introduce excessive operational complexity for a single-company enterprise resource system, while an unstructured monolith becomes difficult to maintain.
- **Decision**: Modular monolithic backend organized by domain feature modules, with an abstract `BaseConnector` pattern for provider integrations.
- **Consequences**: Clear separation of concerns, testability, and painless extension to new third-party providers.
