# TrustOps Deployment Guide

## Deployment Modes

Set `DEPLOYMENT_MODE` in `.env`:

| Mode | Description | Use Case |
|------|-------------|----------|
| `local-demo` | Single machine, Docker Compose, seed data | Sales demos, development |
| `pilot-single-tenant` | One SOC provider org, production-like config | First customer pilot |
| `pilot-multi-client` | One provider, multiple managed clients | MDR practice pilot |

## Local Demo

```bash
cp .env.example .env
docker compose up -d db
cd backend && alembic upgrade head && python seed.py
cd backend && uvicorn app.main:app --reload --port 8001
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

**Health checks:**
- `GET /health` — API alive
- `GET /ready` — database connected
- `GET /version` — version and deployment mode

## Pilot Single-Tenant

1. Provision PostgreSQL 16 (managed or self-hosted)
2. Set production secrets:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/trustops
JWT_SECRET=<random-256-bit-secret>
WEBHOOK_API_KEY=<random-api-key>
DEPLOYMENT_MODE=pilot-single-tenant
APP_VERSION=0.2.1-pilot-admin
CORS_ORIGINS=https://trustops.yourdomain.com
```

3. Run migrations: `alembic upgrade head`
4. Bootstrap org: `python scripts/pilot_setup.py init-org --name "Your SOC"`
5. Add clients and users via `pilot_setup.py` or API
6. Deploy backend (uvicorn/gunicorn) and frontend (Next.js standalone or static)
7. Configure reverse proxy with TLS

## Pilot Multi-Client

Same as single-tenant, plus:

- Create one client per managed customer (`pilot_setup.py add-client`)
- Map Sentinel `client_id` per customer in playbooks
- Client users scoped to their `client_id` automatically
- Generate per-client monthly reports

## Docker Compose

```bash
docker compose up --build
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

Default ports:
- Frontend: 3000
- Backend: 8000
- Postgres: 5434 (host) → 5432 (container)

## Environment Variables

See `.env.example` for full list. Critical production variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Change from default |
| `WEBHOOK_API_KEY` | Yes | Integration authentication |
| `CORS_ORIGINS` | Yes | Frontend origin(s) |
| `OPENAI_API_KEY` | No | Mock AI used when unset |
| `DEPLOYMENT_MODE` | No | Default: `local-demo` |
| `APP_VERSION` | No | Default: `0.2.1-pilot-admin` |

## Monitoring

- **Liveness:** `GET /health`
- **Readiness:** `GET /ready` (includes DB check)
- **Version:** `GET /version`
- **Sentinel:** `GET /integrations/sentinel/health`

## Backup

Back up PostgreSQL regularly. TrustOps stores all case, decision, QA, and report data in Postgres.

## Scaling Notes (Pilot)

Single backend instance is sufficient for pilot workloads. For production beyond pilot, plan for:
- Managed PostgreSQL with connection pooling
- Horizontal backend scaling behind load balancer
- Object storage for evidence attachments (future)
