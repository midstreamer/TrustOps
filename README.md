# TrustOps

**The SIEM detects. The SOAR enriches. The case platform manages the work. The portal proves the service value.**

TrustOps is a human-in-the-loop SOC case management platform for SOCaaS/MDR providers. It is the operational system of record for managed SOC work — not a SIEM, SOAR, EDR, or XDR replacement.

**Current release:** `v0.1.0-pilot` — see [CHANGELOG.md](CHANGELOG.md)

## Screenshots

> Placeholder — add screenshots of Case Workspace, Trust Metrics, and Client Report preview for your deployment.

| Case Workspace | Trust Metrics | Client Report |
|----------------|---------------|---------------|
| _screenshot_ | _screenshot_ | _screenshot_ |

## Product Capabilities

- Multi-client organization management with tenant isolation
- Security case lifecycle and three-panel analyst workspace
- AI-assisted triage with human-AI agreement tracking
- Trust Metrics v2 with Trust Calibration Score
- SLA policy configuration and event tracking
- QA reviews for SOC managers
- Client Value Report v2 with print/PDF export
- Microsoft Sentinel integration (`POST /integrations/sentinel/alerts`)
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

- Frontend: http://localhost:3000 (or 3001)
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

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

- [docs/demo-script.md](docs/demo-script.md) — step-by-step demo
- [docs/buyer-demo-narrative.md](docs/buyer-demo-narrative.md) — positioning
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

Sample Sentinel payload: [samples/sentinel-alert-payload.json](samples/sentinel-alert-payload.json)

## Admin Setup UI

Platform Admins and SOC Managers can onboard managed clients at **Admin Setup** (`/app/admin/setup`):

- **Overview** — setup checklist for multi-client MDR operations
- **Clients** — add managed clients with default SLA templates; copy `client_id` for integrations
- **Users** — create provider and client portal users (Platform Admin only)
- **SLA Policies** — apply default Critical/High templates per client
- **Sample Data** — generate demo cases or import sample CSV alerts

## Tests & Validation

```bash
cd backend && pytest tests/ -v
API_URL=http://localhost:8001 python scripts/validate_demo.py
cd frontend && npm run build
```

## Environment Variables

See [.env.example](.env.example) for `DATABASE_URL`, `JWT_SECRET`, `WEBHOOK_API_KEY`, `SENTINEL_API_KEY`, `DEPLOYMENT_MODE`, `APP_VERSION`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.

**Re-seeding:** `seed.py` only runs on an empty database:
```bash
docker compose down -v && docker compose up -d db
cd backend && alembic upgrade head && python seed.py
```
