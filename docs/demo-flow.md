# TrustOps Golden Path Demo

This script walks through the pilot-ready demo flow using seed data.

## Prerequisites

```bash
docker compose up -d db
cd backend && alembic upgrade head && python seed.py
uvicorn app.main:app --reload --port 8001
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

**Demo password for all users:** `TrustOps123!`

## Golden Path Case

Use **CASE-GOLDEN** — a fresh Apex Energy case assigned to `analyst1@trustops.demo` with no AI recommendation or analyst decision yet. Ideal for live demos.

## Demo Script (15 minutes)

### 1. Analyst Workflow (5 min)

1. Log in as `analyst1@trustops.demo`
2. Open **Case Queue** — filter by client "Apex Energy" or search `GOLDEN`
3. Open **CASE-GOLDEN** — Suspicious OAuth consent grant
4. Review alert details, SLA timers, and timeline in the left panel
5. Click **Generate** in the AI Triage Assistant (right panel)
6. Review AI recommendation: summary, disposition, priority, confidence
7. In the center panel, submit an **Analyst Decision**
   - Try **Accepted** first, or **Modified** with an override reason
8. Observe human-AI agreement badge and updated timeline
9. Add an investigation note and evidence item

### 2. Manager Workflow (5 min)

1. Log out, log in as `manager@trustops.demo` → lands on **Manager Dashboard**
2. Review open cases, SLA metrics, AI acceptance rates
3. Open **Trust Metrics** — review human-AI decision analytics
4. Open a triaged case → **QA Review**
5. Go to **Reports** → **New Report** → generate for Apex Energy
6. Review report sections, open **Preview**, then **Publish**

### 3. Client Workflow (3 min)

1. Log out, log in as `client@apex.demo` → **Client Dashboard**
2. View open cases, SLA performance, notable incidents
3. Open **Reports** — see only **Published** reports
4. Open the pre-seeded "Apex Energy Monthly SOC Report (Pilot)"
5. Confirm: no internal QA notes, no raw AI prompts, no Riverbend data

### 4. Webhook Ingestion (2 min)

```bash
curl -X POST http://localhost:8001/integrations/webhook/alerts \
  -H "Content-Type: application/json" \
  -H "X-TrustOps-Webhook-Key: dev-webhook-key-change-in-production" \
  -d '{
    "client_id": "<APEX_CLIENT_UUID>",
    "title": "Webhook demo alert",
    "severity": "High",
    "source_system": "Demo SOAR",
    "description": "Alert ingested via webhook",
    "priority": "P2 High"
  }'
```

Get Apex client UUID from `GET /clients` (as manager) or the case queue filter dropdown.

## Automated Validation

```bash
cd backend
API_URL=http://localhost:8001 python scripts/validate_demo.py
pytest tests/ -v
```

## Demo Accounts

| Email | Role | Landing Page |
|-------|------|--------------|
| analyst1@trustops.demo | SOC Analyst | Case Queue |
| manager@trustops.demo | SOC Manager | Manager Dashboard |
| client@apex.demo | Client Admin | Client Dashboard |
| viewer@apex.demo | Client Viewer | Client Dashboard |

## What Clients Never See

- Internal notes (visibility = Internal)
- QA review data
- Raw AI prompts and responses
- Draft reports
- Other clients' cases or dashboards
