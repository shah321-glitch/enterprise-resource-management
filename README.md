# Enterprise Resource & Subscription Management System (ERSMS)

An enterprise-grade MERN platform designed for centralized governance of digital assets, cloud/SaaS subscriptions, project allocations, multi-unit API credit pools, actual vs. forecasted expenses, and automated renewal operations.

---

## Key Features

- **Executive & Operational Dashboard**: Real-time KPI counters (active vs expired subscriptions, upcoming renewals, low credit alerts, actual paid expenses), monthly expense charts, subscription status distributions, and active project allocations.
- **Resource Inventory**: Digital assets lifecycle management (Cloud instances, SaaS tools, Domains, Licenses) with provider details, cost centers, departments, and ownership tracking.
- **Subscriptions & Renewal Automation**: Multi-cadence billing (monthly, quarterly, yearly, one-time, custom), automated renewal reminders (30, 15, 7, 1 days), duplicate renewal prevention, and full renewal history.
- **Projects & Multi-Model Resource Allocation**: Assign resources and responsible staff to projects using equal, percentage, fixed-amount, or usage-based allocation with strict validation against cost double-counting.
- **API Credits & Usage Tracking**: Distinct tracking for monetary balance, request quotas, and LLM token pools with threshold alerts, synchronization logs, and provider connectors.
- **Extensible Provider Integration Framework**: Modular connector interface with connection testing, error classification, retry backoff, and mock development connector.
- **Expense & Budget Management**: Explicit separation of actual paid expenses from recurring forecasts, multi-currency accounting in integer minor units (cents), invoice attachments, and category/provider summaries.
- **Enterprise Reporting**: Interactive filtering, date ranges, and CSV data export for inventory, allocations, subscriptions, API quotas, and expense audits.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions across Super Admin, Admin, Project Manager, and Employee roles with immutable audit logging.
- **Enterprise Security**: Argon2id password hashing, JWT access & refresh token rotation, HttpOnly/Secure cookies, rate limiting, and NoSQL injection defenses.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, TanStack Query v5, React Hook Form, Zod, Recharts, React Router v6 |
| **Backend** | Node.js 24+, Express 4/5, MongoDB, Mongoose 8+, Pino Logger, Swagger/OpenAPI 3.0, Zod |
| **Security & Auth** | Argon2id / Bcryptjs, JSON Web Tokens (Access + Refresh Rotation), Helmet, CORS, Express Rate Limit, Mongo Sanitize |
| **Testing** | Vitest, React Testing Library, Supertest, MongoMemoryServer |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI |

---

## Getting Started

### Prerequisites
- Node.js >= 20 (v24 recommended)
- npm >= 10
- MongoDB >= 6.0 (or Docker / in-memory test mode)

### Local Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Seed Database with Enterprise Sample Data**:
   ```bash
   npm run seed
   ```

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```
   - Client runs at: `http://localhost:5173`
   - Server runs at: `http://localhost:5000`
   - Swagger API Docs: `http://localhost:5000/api/docs`

5. **Run Test Suites**:
   ```bash
   npm test
   ```

---

## Default User Accounts (Seed Data)

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@enterprise.internal` | `Admin#2026!Secure` |
| **Admin** | `admin@enterprise.internal` | `Admin#2026!Secure` |
| **Project Manager** | `pm@enterprise.internal` | `Manager#2026!Secure` |
| **Employee** | `engineer@enterprise.internal` | `Employee#2026!Secure` |

---

## Documentation Links

- [Architecture Guide](docs/architecture.md)
- [Database Design & Schemas](docs/database-design.md)
- [API Specification](docs/api-specification.md)
- [Security Architecture](docs/security.md)
- [Deployment & Operations](docs/deployment.md)
- [Development Status & Roadmap](docs/development-status.md)
- [Architectural Decision Records (ADRs)](docs/decisions.md)
- [Agent & Developer Guidelines](AGENTS.md)
