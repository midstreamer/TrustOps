# TrustOps Pilot Launch Runbook

**Version:** v0.2.0-operational-pilot  
**Duration:** 30 days  
**Audience:** SOC provider pilot lead, SOC manager, platform admin

This runbook is the operational guide for launching a first commercial pilot. For infrastructure bootstrap, see [pilot-setup.md](pilot-setup.md). For deployment modes and env vars, see [deployment.md](deployment.md).

---

## Pilot scope (define before Day 0)

| Item | Recommendation |
|------|----------------|
| Provider org | One SOC / MDR practice |
| Managed clients | 1–3 clients |
| Integration | Microsoft Sentinel for **one** client first |
| Users | 1 manager, 2+ analysts, 1 client admin per pilot client |
| Deployment mode | `pilot-single-tenant` (or `pilot-multi-client` if 2+ clients) |
| AI mode | Set `OPENAI_API_KEY` for production pilot (mock AI is demo-only) |

**Pilot lead** owns the checklist below. **SOC manager** owns weekly QA and Trust Metrics review. **Platform admin** owns deployment and integrations.

---

## Pre-launch (Days -7 to 0)

### Infrastructure

- [ ] Provision PostgreSQL 16 (managed preferred)
- [ ] Deploy backend and frontend with TLS (reverse proxy)
- [ ] Set production `.env`:

```bash
DEPLOYMENT_MODE=pilot-single-tenant
APP_VERSION=0.2.0-pilot
DATABASE_URL=postgresql://...
JWT_SECRET=<random-256-bit>
WEBHOOK_API_KEY=<random-api-key>
CORS_ORIGINS=https://trustops.yourdomain.com
OPENAI_API_KEY=<your-key>   # recommended for pilot
```

- [ ] Run migrations: `cd backend && alembic upgrade head`
- [ ] Verify health:
  - `GET /health` → ok
  - `GET /ready` → ready
  - `GET /version` → `0.2.0-pilot`, correct `deployment_mode`

### Security hardening

See [security-controls.md](security-controls.md).

- [ ] Rotate all secrets from `.env.example` defaults
- [ ] Change default user passwords (`TrustOps123!` → unique per user)
- [ ] Restrict CORS to production frontend URL only
- [ ] Enable database backups (daily minimum)
- [ ] Document who holds webhook keys and rotation schedule

### Org bootstrap

```bash
cd backend
python scripts/pilot_setup.py init-org --name "Your SOC Name"
python scripts/pilot_setup.py add-client --org "Your SOC Name" --client-name "Pilot Client A" --industry Energy --tier Premium
python scripts/pilot_setup.py add-user --org "Your SOC Name" --email manager@yourco.com --name "SOC Manager" --role "SOC Manager"
python scripts/pilot_setup.py add-user --org "Your SOC Name" --email analyst@yourco.com --name "SOC Analyst" --role "SOC Analyst"
python scripts/pilot_setup.py add-user --org "Your SOC Name" --email client@pilotclient.com --name "Client Security Lead" --role "Client Admin" --client "Pilot Client A"
```

Or use **Admin Setup** (`/app/admin/setup`) for clients, users, and SLA templates.

- [ ] Confirm SLA policies exist for Critical and High per client
- [ ] Copy each client's `client_id` from Admin Setup → Clients

### Sentinel integration (pilot client)

- [ ] Deploy Logic App from `samples/sentinel-logic-app-workflow.json` (replace placeholders)
- [ ] Map Sentinel playbook → `POST /integrations/sentinel/alerts`
- [ ] Set `TrustOpsClientId` to the pilot client's UUID
- [ ] Verify: `GET /integrations/sentinel/health`
- [ ] Send one test alert; confirm case appears in Case Queue
- [ ] Replay same `source_alert_id`; confirm **no duplicate case** (dedup)

### Validation gate (must pass before go-live)

```bash
cd backend && pytest tests/ -q
API_URL=https://api.trustops.yourdomain.com python scripts/validate_demo.py
```

- [ ] Manager can log in → Manager Dashboard loads
- [ ] Analyst can log in → Case Queue loads
- [ ] Client can log in → Client Dashboard + funnel + SOC Assistant visible
- [ ] Client **cannot** access QA, draft reports, or other clients' data

### Kickoff meeting (Day 0)

- [ ] Walk analysts through three-panel case workspace
- [ ] Walk manager through Trust Metrics and report publish flow
- [ ] Walk client admin through Client Dashboard, funnel, and SOC Assistant
- [ ] Agree: all pilot-client alerts triaged in TrustOps (target >80% by Day 30)
- [ ] Schedule weekly 15-min pilot sync (manager + pilot lead)

---

## Week 1 — Go-live and first cases

**Goal:** Real alerts flowing; analysts using TrustOps as system of record.

### Daily (analyst)

- [ ] Triage all new pilot-client cases in TrustOps (not only in SIEM)
- [ ] Generate AI recommendation on ≥50% of new cases
- [ ] Submit analyst decision with notes for every closed/triaged case
- [ ] Assign cases when ownership is clear

### Daily (manager)

- [ ] Review Case Queue for SLA at-risk / breached
- [ ] Check **Admin Setup → Integrations** event log for ingestion failures
- [ ] Unblock analysts on integration or access issues

### End of Week 1 checklist

| Check | Target |
|-------|--------|
| Alerts ingested from Sentinel | ≥1 real case created |
| Cases with analyst decision | ≥3 |
| AI recommendations generated | ≥50% of new cases |
| Integration errors | Zero unresolved auth/client_id failures |
| Client login tested | Client admin logged in once |

**If behind:** reduce scope to one severity band (e.g. High+) rather than skipping TrustOps for alerts.

---

## Week 2 — Workflow adoption and QA start

**Goal:** Human-AI decisions captured consistently; QA rhythm begins.

### Analyst standards

- [ ] Every disposition includes decision notes
- [ ] Overrides document override reason (Modified decisions)
- [ ] Evidence and investigation notes added on escalated cases

### Manager — first QA sample

- [ ] Select 3–5 completed cases from Week 1
- [ ] Complete QA review on each (`/app/cases/{id}/qa`)
- [ ] Note any reversal patterns for analyst coaching

### Manager — Trust Metrics

- [ ] Open **Trust Metrics** → filter to pilot client
- [ ] Review Trust Calibration Score and weekly trends
- [ ] Record baseline calibration score: ___________

### End of Week 2 checklist

| Check | Target |
|-------|--------|
| Cases triaged through TrustOps | Trending toward >50% of pilot alerts |
| QA reviews completed | ≥3 |
| Trust Metrics reviewed | Yes, with client filter |
| Analyst coaching session | 1 session held |

---

## Week 3 — Governance rhythm

**Goal:** SLA and trust metrics are part of normal operations.

### Manager (weekly)

- [ ] Trust Metrics review — compare to Week 2 baseline
- [ ] QA sample: 3–5 cases (mix of Accepted and Modified decisions)
- [ ] Review override reason categories — any recurring false-positive patterns?
- [ ] Check SLA performance on Manager Dashboard

### Platform admin

- [ ] Verify database backup restore works (tabletop)
- [ ] Review integration event log for the week
- [ ] Confirm no default passwords remain

### Optional: internal dry-run

- [ ] Manager generates **draft** monthly report for pilot client
- [ ] Review AI sections; use **Regenerate** if content is thin
- [ ] Do **not** publish yet — dry run only

### End of Week 3 checklist

| Check | Target |
|-------|--------|
| Weekly QA | Completed |
| Trust Calibration reviewed | 2nd consecutive week |
| Cases in TrustOps | >70% of pilot client alerts |
| Report dry-run | Draft generated and reviewed |

---

## Week 4 — Client value and report publish

**Goal:** Client sees proof of value before Day 30 QBR.

### Manager

- [ ] Generate monthly report for pilot client
- [ ] Preview all v2 sections (Service Activity, AI Oversight, Trust Metrics Summary, Value Delivered)
- [ ] Regenerate if executive summary or key sections are empty
- [ ] **Publish** report

### Client admin

- [ ] Log in to Client Dashboard
- [ ] Review SOC Workflow Funnel (30-day period)
- [ ] Ask SOC Assistant 2+ questions (e.g. SLA, funnel summary, open cases)
- [ ] Read published monthly report
- [ ] Export PDF via Print / Save as PDF

### Pilot lead

- [ ] Collect client feedback: dashboard clarity, report usefulness, chat answers
- [ ] Document 3 wins and 3 friction points for QBR

### End of Week 4 checklist

| Check | Target |
|-------|--------|
| Published report | 1 per pilot client |
| Client used SOC Assistant | Yes |
| Client reviewed funnel | Yes |
| Feedback captured | Written notes for QBR |

---

## Day 30 — Pilot review (QBR)

### Success scorecard

| Metric | Target | Actual |
|--------|--------|--------|
| Cases triaged through TrustOps | >80% of pilot client alerts | |
| AI recommendations generated | >50% of new cases | |
| QA reviews completed | Weekly throughout pilot | |
| Client report published | 1 per client | |
| Trust Calibration reviewed | Weekly by manager | |
| Sentinel ingestion uptime | No unresolved failures >24h | |
| Client portal engagement | Funnel + chat + report viewed | |

### QBR agenda (60 min)

1. **Service activity** — case volume, severity mix, SLA performance (5 min)
2. **SOC workflow funnel** — how alerts progressed; trends (10 min)
3. **Human-AI trust** — Trust Calibration, override patterns, QA findings (10 min)
4. **Client report walkthrough** — published report highlights (10 min)
5. **Client feedback** — dashboard, assistant, reporting (10 min)
6. **Decision** — extend pilot, expand clients, or adjust scope (15 min)

### Go / no-go criteria

**Extend pilot** if:

- >80% alert triage in TrustOps
- Manager runs QA and Trust Metrics weekly without prompting
- Client admin uses portal independently
- No unresolved security or tenant-isolation issues

**Pause and fix** if:

- Integration reliability blocks case creation
- Client sees cross-tenant data (critical — stop pilot immediately)
- Analysts bypass TrustOps for routine triage

### v0.3 backlog input

Capture from QBR:

- Integration gaps (second connector, SOAR, dedup edge cases)
- Analyst workflow friction (assignment, notifications, case queue filters)
- Client portal requests (funnel drill-down, chat depth, mobile)
- Reporting gaps (scheduling, server-side PDF, branding)

---

## Roles (RACI)

| Activity | Pilot lead | Platform admin | SOC manager | SOC analyst | Client admin |
|----------|:----------:|:--------------:|:-----------:|:-----------:|:------------:|
| Deploy & secrets | A | R | I | — | — |
| Sentinel integration | A | R | C | I | — |
| Case triage | I | — | A | R | — |
| AI recommendations | — | — | A | R | — |
| QA reviews | I | — | R | I | — |
| Trust Metrics review | I | — | R | — | — |
| Report publish | I | — | R | — | I |
| Client dashboard | I | — | C | — | R |
| Day 30 QBR | R | C | R | I | R |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## Troubleshooting

| Symptom | Check | Fix |
|---------|-------|-----|
| No cases from Sentinel | Integration event log; `GET /integrations/sentinel/health` | Verify `client_id`, webhook key, Logic App URL |
| Duplicate cases | Same alert without `source_alert_id` | Ensure Sentinel payload includes stable alert ID |
| Empty report sections | Report detail → Regenerate | Set `OPENAI_API_KEY`; manager regenerates before publish |
| Client sees wrong data | User `client_id` assignment | Fix in Admin Setup → Users |
| 401 on integration | `X-TrustOps-Webhook-Key` mismatch | Align Logic App secret with `WEBHOOK_API_KEY` |
| Frontend blank / chunk errors | Dev + build cache conflict | Use `npm run dev:fresh`; never `build` during `dev` |

---

## Reference links

| Document | Use |
|----------|-----|
| [pilot-setup.md](pilot-setup.md) | Bootstrap commands |
| [deployment.md](deployment.md) | Env vars and deployment modes |
| [security-controls.md](security-controls.md) | RBAC and hardening |
| [demo-script.md](demo-script.md) | Kickoff walkthrough |
| [buyer-demo-narrative.md](buyer-demo-narrative.md) | Positioning for QBR |
| [integrations/sentinel.md](integrations/sentinel.md) | Sentinel dedup and Logic App |
| [releases/v0.2.0-pilot.md](releases/v0.2.0-pilot.md) | v0.2 feature list |

---

## Pilot launch one-pager (printable)

```
TRUSTOPS PILOT — 30 DAYS
─────────────────────────
Provider: _______________________
Pilot client(s): _________________
Go-live date: ___________________
Pilot lead: ______________________

Week 1  → Sentinel live, first cases triaged
Week 2  → QA started, Trust Metrics baseline
Week 3  → Weekly governance, report dry-run
Week 4  → Publish report, client uses funnel + chat
Day 30  → QBR and go/no-go

Success: >80% alerts in TrustOps | weekly QA | 1 published report/client
```
