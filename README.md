# TrustOps MVP

**The SIEM detects. The SOAR enriches. The case platform manages the work. The portal proves the service value.**

TrustOps is a human-in-the-loop SOC case management platform for SOCaaS/MDR providers. It is the operational system of record for managed SOC work — not a SIEM, SOAR, EDR, or XDR replacement.

## Product Capabilities (MVP)

- Multi-client organization management
- Security case lifecycle management
- CSV alert import with preview/confirm
- AI-assisted triage recommendations (OpenAI or mock mode)
- Analyst decision capture with human-AI agreement tracking
- SLA policy configuration and event tracking
- QA reviews for SOC managers
- Client-facing monthly value reports
- Role-based dashboards for analysts, managers, and clients

## Architecture

```text
trustops/
  frontend/     Next.js 14 + React + TypeScript + Tailwind
  backend/      FastAPI + SQLAlchemy + Alembic + PostgreSQL
  docker-compose.yml
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI, Python, SQLAlchemy, Alembic, Pydantic |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt + RBAC |
| AI | OpenAI-compatible API (mock fallback for demos) |

## Local Setup

### Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

In a separate terminal:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

> **Port conflicts:** If 5432 or 8000 are in use, Postgres is mapped to **5434** in `docker-compose.yml`. Run the backend on **8001** and set `NEXT_PUBLIC_API_URL=http://localhost:8001`.

### Local Development

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://trustops:trustops@localhost:5434/trustops
alembic upgrade head && python seed.py
export CORS_ORIGINS=http://localhost:3000,http://localhost:3001
uvicorn app.main:app --reload --port 8001
```

**Frontend:**

```bash
cd frontend
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8001
npm run dev
```

## Environment Variables

See `.env.example` for `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `WEBHOOK_API_KEY`.

## Pilot Readiness (Phase 2)

New capabilities in this phase:

- **Golden path demo** — `CASE-GOLDEN` seed case for live analyst workflow demos
- **Three-panel case workspace** — alert/SLA/timeline, investigation/decision, AI triage assistant
- **Trust Metrics** — `/app/trust-metrics` with human-AI decision analytics
- **Webhook alert ingestion** — `POST /integrations/webhook/alerts` (API key auth)
- **Client report upgrade** — structured sections, preview mode, print-friendly view
- **Security tests** — tenant isolation and audit log coverage

See [docs/demo-flow.md](docs/demo-flow.md) for the full golden path demo script.

## Demo User Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@trustops.demo | Platform Admin | TrustOps123! |
| manager@trustops.demo | SOC Manager | TrustOps123! |
| analyst1@trustops.demo | SOC Analyst | TrustOps123! |
| analyst2@trustops.demo | SOC Analyst | TrustOps123! |
| client@apex.demo | Client Admin (Apex Energy) | TrustOps123! |
| viewer@apex.demo | Client Viewer (Apex Energy) | TrustOps123! |

## Running Tests

```bash
cd backend && pytest tests/ -v
```

## Demo Validation

Automated API validation (golden path, trust metrics, webhook, isolation):

```bash
cd backend
export DATABASE_URL=postgresql://trustops:trustops@localhost:5434/trustops
API_URL=http://localhost:8001 python scripts/validate_demo.py
```

Manual UI demo: see [docs/demo-flow.md](docs/demo-flow.md).

**Re-seeding:** `seed.py` only runs on an empty database. For a fresh pilot demo:

```bash
docker compose down -v && docker compose up -d db
cd backend && alembic upgrade head && python seed.py
```
