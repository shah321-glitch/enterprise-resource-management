# ERSMS Deployment & Operations Guide

## 1. Containerization Architecture

ERSMS is fully containerized using Docker and Docker Compose for reproducible builds and zero-drift deployment across development, staging, and production.

```
├── Dockerfile.server       # Multi-stage Node.js 24 Alpine container
├── Dockerfile.client       # Multi-stage Vite build + Nginx Alpine static serving
└── docker-compose.yml      # Multi-service stack (Server, Client, MongoDB, Mongo-Express)
```

---

## 2. Environment Variables

### Backend Configuration (`server/.env`)
```ini
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://root:enterprise_secret@mongo:27017/ersms?authSource=admin
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:80
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
LOG_LEVEL=info
CRON_ENABLED=true
```

### Frontend Configuration (`client/.env`)
```ini
VITE_API_BASE_URL=/api/v1
```

---

## 3. Running with Docker Compose

To spin up the entire cluster with a single command:
```bash
docker compose up --build -d
```

Services initialized:
- `client`: Accessible at `http://localhost:80`
- `server`: Accessible at `http://localhost:5000`
- `mongo`: Persistent MongoDB cluster on port `27017`

### Health & Readiness Endpoints
- **Liveness probe**: `GET /api/v1/health` (Returns HTTP 200 `{ status: "ok", timestamp: ... }`)
- **Readiness probe**: `GET /api/v1/health/ready` (Validates database connectivity and active connector health)

---

## 4. Continuous Integration (CI)

GitHub Actions workflow is located at `.github/workflows/ci.yml`:
1. Checks out repository.
2. Installs Node.js dependencies (`npm ci`).
3. Executes linter and format validation.
4. Executes backend integration tests against MongoDB Memory Server.
5. Executes frontend component and unit tests with Vitest.
6. Builds production artifacts for client and server.
