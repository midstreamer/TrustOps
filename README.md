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

See `.env.example` for `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`.

## Demo User Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@trustops.demo | Platform Admin | TrustOps123! |
| manager@trustops.demo | SOC Manager | TrustOps123! |
| analyst1@trustops.demo | SOC Analyst | TrustOps123! |
| analyst2@trustops.demo | SOC Analyst | TrustOps123! |
| client@apex.demo | Client Admin (Apex Energy) | TrustOps123! |

## Running Tests

```bash
cd backend && pytest tests/ -v
```

## Demo Validation

Automated API validation (all 19 PRD demo steps):

```bash
cd backend
export DATABASE_URL=postgresql://trustops:trustops@localhost:5434/trustops
API_URL=http://localhost:8001 python scripts/validate_demo.py
```

Manual UI demo flow:

1. Log in as `analyst1@trustops.demo` → lands on **Case Queue**
2. Open a case → generate AI recommendation → submit analyst decision
3. Log in as `manager@trustops.demo` → lands on **Manager Dashboard**
4. Open a case → **QA Review** → **Reports** → generate and publish
5. Log in as `client@apex.demo` → **Client Dashboard** → view published report only

## MVP Demo Flow (API)

1. Analyst login → case queue → create case → AI triage → decision → notes/evidence
2. Manager login → dashboard → QA review → generate/publish monthly report
3. Client login → client dashboard → published reports only
4. Verify client cannot see internal notes, QA data, or other clients' data
