# TrustOps

**The SIEM detects. The SOAR enriches. The case platform manages the work. The portal proves the service value.**

TrustOps is a human-in-the-loop SOC case management platform for SOCaaS/MDR providers. It is the operational system of record for managed SOC work — not a SIEM, SOAR, EDR, or XDR replacement.

**Current release:** `v0.2.0-pilot` — see [CHANGELOG.md](CHANGELOG.md) and [v0.2 release notes](docs/releases/v0.2.0-pilot.md)

## Screenshots

> Placeholder — add screenshots of Case Workspace, Client Dashboard funnel, and Client Report preview for your deployment.

| Case Workspace | Client Dashboard | Client Report |
|----------------|------------------|---------------|
| _screenshot_ | _screenshot_ | _screenshot_ |

## Product Capabilities

- Multi-client organization management with tenant isolation
- Security case lifecycle and three-panel analyst workspace
- AI-assisted triage with human-AI agreement tracking
- Trust Metrics v2 with Trust Calibration Score, client/date filters, and weekly trends
- SLA policy configuration and event tracking
- QA reviews for SOC managers
- Client Value Report v2 with print/PDF export and AI regeneration
- Client Dashboard SOC workflow funnel with period filtering
- Client SOC Assistant — AI chat sidebar grounded in dashboard data
- Microsoft Sentinel integration with deduplication and event logging
- Generic webhook alert ingestion
- Role-based dashboards for analysts, managers, and clients

## Architecture

```text
trustops/
  frontend/     Next.js 14 + React + TypeScript + Tailwind
  backend/      FastAPI + SQLAlchemy + Alembic + PostgreSQL
  docs/         Demo scripts, deployment, integrations
  samples/      Integration payload samples
  docker-compose.yml
```

## Quick Start (Local Demo)

```bash
cp .env.example .env
docker compose up -d db
cd backend && alembic upgrade head && python seed.py
uvicorn app.main:app --reload --port 8001
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

- Frontend: http://localhost:3001
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

Copy `NEXT_PUBLIC_API_URL` into `frontend/.env.local` so you do not need to pass it every time.

### Frontend dev vs build

The dev server writes to `frontend/.next-dev`. Production builds use `frontend/.next`. **Do not run `npm run build` while `npm run dev` is running** — that mix used to corrupt the cache and cause blank pages or missing chunk errors.

| Command | When to use |
|---------|-------------|
| `npm run dev` | Local development (port 3001) |
| `npm run build:check` | Verify TypeScript/build **with dev still running** |
| `npm run build` | Production build (stop dev first) |
| `npm run dev:fresh` | Clear all Next caches and restart dev |

**Health endpoints:** `GET /health` · `GET /ready` · `GET /version`

## Demo Accounts

| Email | Role | Password |
|-------|------|----------|
| analyst1@trustops.demo | SOC Analyst | TrustOps123! |
| manager@trustops.demo | SOC Manager | TrustOps123! |
| client@apex.demo | Client Admin (Apex) | TrustOps123! |
| viewer@apex.demo | Client Viewer (Apex) | TrustOps123! |
| admin@trustops.demo | Platform Admin | TrustOps123! |

## Buyer Demo (20 min)

Start with **CASE-GOLDEN** (Apex Energy). Full script:

- [docs/demo-script.md](docs/demo-script.md) — step-by-step demo (updated for v0.2 client portal)
- [docs/buyer-demo-narrative.md](docs/buyer-demo-narrative.md) — positioning
- [docs/releases/v0.2.0-pilot.md](docs/releases/v0.2.0-pilot.md) — v0.2 release notes
- [docs/demo-personas.md](docs/demo-personas.md) — personas
- [docs/demo-data-dictionary.md](docs/demo-data-dictionary.md) — seed data reference

## Pilot Deployment

- [docs/deployment.md](docs/deployment.md) — local-demo, pilot-single-tenant, pilot-multi-client
- [docs/pilot-setup.md](docs/pilot-setup.md) — step-by-step pilot bootstrap
- [docs/security-controls.md](docs/security-controls.md) — security model

**CLI setup:**
```bash
cd backend
python scripts/pilot_setup.py init-org --name "Your SOC"
python scripts/pilot_setup.py add-client --client-name "Apex Energy"
python scripts/pilot_setup.py add-user --email analyst@demo --name "Analyst" --role "SOC Analyst"
python scripts/pilot_setup.py demo-case --client "Apex Energy"
```

## Integrations

| Integration | Endpoint | Docs |
|-------------|----------|------|
| Microsoft Sentinel | `POST /integrations/sentinel/alerts` | [docs/integrations/sentinel.md](docs/integrations/sentinel.md) |
| Generic webhook | `POST /integrations/webhook/alerts` | [docs/demo-flow.md](docs/demo-flow.md) |
| Integration logs | `GET /integrations/logs` | Admin Setup → Integrations |

Sample Sentinel payload: [samples/sentinel-alert-payload.json](samples/sentinel-alert-payload.json)

## Admin Setup UI

Platform Admins and SOC Managers can onboard managed clients at **Admin Setup** (`/app/admin/setup`):

- **Overview** — setup checklist for multi-client MDR operations
- **Clients** — add managed clients with default SLA templates; copy `client_id` for integrations
- **Integrations** — client ID mapping for Sentinel/webhook; integration event log
- **Users** — create provider and client portal users (Platform Admin only)
- **SLA Policies** — apply default Critical/High templates per client
- **Sample Data** — generate demo cases or import sample CSV alerts

## Trust Metrics

Managers can filter Trust Metrics (`/app/trust-metrics`) by **client** and **date range**, with **weekly trend charts** for acceptance rate and calibration score during pilot QBRs.

Query params on `GET /dashboards/trust-metrics`: `client_id`, `start_date`, `end_date`, `trend_weeks`.

## Tests & Validation

```bash
cd backend && pytest tests/ -v
API_URL=http://localhost:8001 python scripts/validate_demo.py
cd frontend && npm run build:check
```

## Environment Variables

See [.env.example](.env.example) for `DATABASE_URL`, `JWT_SECRET`, `WEBHOOK_API_KEY`, `SENTINEL_API_KEY`, `DEPLOYMENT_MODE`, `APP_VERSION`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.

**Re-seeding:** `seed.py` only runs on an empty database:
```bash
docker compose down -v && docker compose up -d db
cd backend && alembic upgrade head && python seed.py
```
