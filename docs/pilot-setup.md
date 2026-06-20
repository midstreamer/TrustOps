# TrustOps Pilot Setup

Step-by-step guide to stand up a commercial pilot.

## Prerequisites

- PostgreSQL 16
- Python 3.10+
- Node.js 18+
- Docker (optional, for local demo)

## Step 1: Deploy Infrastructure

Follow `docs/deployment.md` for your target mode (`pilot-single-tenant` or `pilot-multi-client`).

```bash
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, WEBHOOK_API_KEY, DEPLOYMENT_MODE
cd backend && alembic upgrade head
```

## Step 2: Create Organization

```bash
cd backend
python scripts/pilot_setup.py init-org --name "Acme MDR"
```

Creates organization and all RBAC roles.

## Step 3: Create Clients

Use **Admin Setup** in the UI (`/app/admin/setup` as Platform Admin or SOC Manager), or the CLI:

```bash
python scripts/pilot_setup.py add-client \
  --org "Acme MDR" \
  --client-name "Apex Energy" \
  --industry Energy \
  --tier Premium

python scripts/pilot_setup.py add-client \
  --org "Acme MDR" \
  --client-name "Riverbend Health" \
  --industry Healthcare \
  --tier Standard
```

SLA policies for Critical and High severities are created automatically.

## Step 4: Create Users

```bash
python scripts/pilot_setup.py add-user \
  --org "Acme MDR" --email manager@acme.demo \
  --name "SOC Manager" --role "SOC Manager"

python scripts/pilot_setup.py add-user \
  --org "Acme MDR" --email analyst@acme.demo \
  --name "SOC Analyst" --role "SOC Analyst"

python scripts/pilot_setup.py add-user \
  --org "Acme MDR" --email client@apex.demo \
  --name "Apex Client" --role "Client Admin" \
  --client "Apex Energy"
```

Default password: `TrustOps123!` (change in production).

## Step 5: Configure SLA Policies

Use the UI: **SLA Settings** (as manager) or API `POST /sla/policies`.

Default policies are created per client for Critical and High severities.

## Step 6: Connect Integrations

### Microsoft Sentinel

1. Set `WEBHOOK_API_KEY` in `.env`
2. Verify: `GET /integrations/sentinel/health`
3. Configure Sentinel playbook → `POST /integrations/sentinel/alerts`
4. See `docs/integrations/sentinel.md`

### Generic Webhook

Any SIEM/SOAR can POST to `POST /integrations/webhook/alerts` with the same API key.

## Step 7: Import or Generate Demo Data

**Full demo seed (local only):**
```bash
python seed.py
```

**Single demo case:**
```bash
python scripts/pilot_setup.py demo-case --client "Apex Energy" \
  --title "[PILOT] Suspicious OAuth consent grant"
```

**CSV import:** Use Case Queue → Import Alerts in the UI.

## Step 8: Validate

```bash
API_URL=http://localhost:8001 python scripts/validate_demo.py
pytest tests/ -v
```

## Step 9: Run Buyer Demo

Follow `docs/demo-script.md` with personas from `docs/demo-personas.md`.

## Step 10: Launch the 30-Day Pilot

Follow **[pilot-launch-runbook.md](pilot-launch-runbook.md)** for the week-by-week operational checklist from go-live through Day 30 QBR.

## Step 11: Pilot Success Criteria (30 days)

| Metric | Target |
|--------|--------|
| Cases triaged through TrustOps | >80% of pilot client alerts |
| AI recommendations generated | >50% of new cases |
| QA reviews completed | Weekly on sample cases |
| Client report published | 1 per client per month |
| Trust Calibration tracked | Reviewed weekly by manager |

## Quick Local Demo (Skip Custom Setup)

```bash
docker compose up -d db
cd backend && alembic upgrade head && python seed.py
```

Use pre-seeded accounts and CASE-GOLDEN from `docs/demo-data-dictionary.md`.
