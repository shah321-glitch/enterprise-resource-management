# ERSMS API Specification (REST v1)

Base URL: `/api/v1`  
Documentation UI: `http://localhost:5000/api/docs` (OpenAPI / Swagger 3.0)

---

## 1. Response Envelope Format

All API responses adhere to a consistent JSON structure:

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      { "field": "costInCents", "message": "Expected integer >= 0" }
    ]
  }
}
```

---

## 2. API Endpoints Overview

### 2.1 Authentication (`/auth`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register new employee | Public / Admin (tenant policy) |
| `POST` | `/auth/login` | Authenticate with email/password; issue tokens | Public (Rate Limited) |
| `POST` | `/auth/refresh` | Rotate access token via refresh token cookie | Public |
| `POST` | `/auth/logout` | Invalidate refresh session and clear cookie | Authenticated |
| `GET` | `/auth/me` | Fetch authenticated user profile & permissions | Authenticated |

### 2.2 Users & Access Control (`/users`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/users` | List users with pagination and search | Admin, Super Admin |
| `GET` | `/users/:id` | Fetch specific user details | Admin, Super Admin, Self |
| `PUT` | `/users/:id` | Update profile / department / role | Admin, Super Admin |
| `PATCH` | `/users/:id/status` | Activate or deactivate user | Super Admin |

### 2.3 Resources (`/resources`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/resources` | List resources with pagination, filters, search | All roles |
| `POST` | `/resources` | Create a new digital resource | Admin, Super Admin, Project Manager |
| `GET` | `/resources/:id` | Get resource details and linked entities | All roles |
| `PUT` | `/resources/:id` | Update resource fields | Admin, Super Admin, Owner |
| `DELETE` | `/resources/:id` | Soft-delete / archive resource | Admin, Super Admin |
| `GET` | `/resources/categories/summary` | Get count & costs grouped by category | All roles |

### 2.4 Subscriptions & Renewals (`/subscriptions`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/subscriptions` | List subscriptions (filter by status, provider) | All roles |
| `POST` | `/subscriptions` | Create subscription linked to resource | Admin, Super Admin, Project Manager |
| `GET` | `/subscriptions/:id` | Detailed subscription view with renewal history | All roles |
| `PUT` | `/subscriptions/:id` | Update plan, cost, renewal dates | Admin, Super Admin |
| `POST` | `/subscriptions/:id/renew` | Record manual renewal & update cycle | Admin, Super Admin |
| `POST` | `/subscriptions/:id/cancel` | Cancel subscription with reason | Admin, Super Admin |
| `GET` | `/subscriptions/renewals/upcoming` | List subscriptions renewing in <= 30 days | All roles |

### 2.5 Projects & Allocations (`/projects`, `/allocations`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/projects` | List projects with budget and resource summary | All roles |
| `POST` | `/projects` | Create a new project | Admin, Super Admin, Project Manager |
| `GET` | `/projects/:id` | Detailed project view with assigned resources | All roles |
| `PUT` | `/projects/:id` | Update project details / budget | Admin, Super Admin, Project Manager |
| `GET` | `/allocations` | List allocations (by project or resource) | All roles |
| `POST` | `/allocations` | Assign resource to project with validation | Admin, Super Admin, Project Manager |
| `PUT` | `/allocations/:id` | Update allocation weight / method / dates | Admin, Super Admin, Project Manager |
| `DELETE` | `/allocations/:id` | Release/terminate resource allocation | Admin, Super Admin, Project Manager |

### 2.6 API Credit & Usage Tracking (`/api-credits`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/api-credits` | List all API credit pools and statuses | All roles |
| `POST` | `/api-credits` | Register new credit account / pool | Admin, Super Admin, Project Manager |
| `GET` | `/api-credits/:id` | View balance, thresholds, and sync history | All roles |
| `PUT` | `/api-credits/:id` | Update balance / threshold limit manually | Admin, Super Admin |
| `POST` | `/api-credits/:id/sync` | Trigger on-demand sync via connector | Admin, Super Admin |

### 2.7 Expenses & Forecasts (`/expenses`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/expenses` | List expenses (actuals only by default) | All roles |
| `POST` | `/expenses` | Record a verified paid expense | Admin, Super Admin, Project Manager |
| `GET` | `/expenses/:id` | Expense detail with receipt/invoice ref | All roles |
| `PUT` | `/expenses/:id` | Update expense record | Admin, Super Admin |
| `DELETE` | `/expenses/:id` | Delete expense with audit logging | Admin, Super Admin |
| `GET` | `/expenses/summary/monthly` | Monthly breakdown by provider/category | All roles |
| `GET` | `/expenses/forecasts` | Recurring subscription cost projections | All roles |

### 2.8 Reports & Analytics (`/reports`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/reports/dashboard-stats` | Real-time aggregate KPIs for dashboard | All roles |
| `GET` | `/reports/resource-inventory` | Comprehensive resource report + CSV | All roles |
| `GET` | `/reports/project-costs` | Project-wise allocated costs + CSV | All roles |
| `GET` | `/reports/subscription-status` | Status distributions & renewal risks | All roles |
| `GET` | `/reports/export/csv` | Generic secure CSV exporter with filters | Admin, Super Admin, Project Manager |

### 2.9 Notifications (`/notifications`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/notifications` | List user's notifications (unread count) | Authenticated |
| `PATCH` | `/notifications/:id/read` | Mark individual notification as read | Authenticated |
| `PATCH` | `/notifications/read-all` | Mark all user notifications as read | Authenticated |

### 2.10 Audit Logs (`/audit-logs`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/audit-logs` | Filterable immutable audit trail | Super Admin, Admin |
| `GET` | `/audit-logs/:id` | Full payload diff and metadata | Super Admin, Admin |
