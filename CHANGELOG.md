# Changelog

All notable changes to TrustOps are documented here.

## [0.2.0-pilot] — 2026-06-18

### Client Portal v2

#### SOC Workflow Funnel
- Added client dashboard workflow funnel — Alerts Received → Triage → Investigation → Confirmed Incidents
- Period selector (7/30/90 days) with trend percentages per stage
- `GET /dashboards/client/{id}?days=30` returns `workflow_funnel` and `period_days`
- Added `frontend/components/dashboard/soc-workflow-funnel.tsx`
- Added `tests/test_client_funnel.py`

#### Client SOC Assistant
- Added AI chat for client users — ask questions about dashboard data while reviewing
- Sticky right-hand sidebar on Client Dashboard (`layout="sidebar"`)
- `POST /dashboards/client/{client_id}/chat` with dashboard context injection
- Formatted responses: bullets, bold metrics, readable structure
- Added `tests/test_client_chat.py`

### Report Reliability

- Added `POST /reports/{report_id}/regenerate` for managers to refresh AI-generated content
- Fixed empty published report sections with AI normalization fallbacks
- Dashboard links to `latest_published_report_id` instead of first published report
- Regenerate button on report detail page
- Added `tests/test_report_generation.py`

### Integration Hardening

- Alert deduplication by `client_id` + `source_system` + `source_alert_id`
- Integration event logging (`integration_events` table, migration `002`)
- `GET /integrations/logs` for manager troubleshooting
- Admin Setup integration log viewer updates
- Sample Azure Logic App workflow: `samples/sentinel-logic-app-workflow.json`
- Updated `docs/integrations/sentinel.md` with dedup and troubleshooting
- Added `tests/test_integration_hardening.py`

### Trust Metrics

- Client and date-range filters on Trust Metrics dashboard
- Weekly trend charts for acceptance rate and calibration score
- Query params: `client_id`, `start_date`, `end_date`, `trend_weeks`
- Added `tests/test_trust_metrics.py`

### Developer Experience

- Separate Next.js dist dirs: dev (`.next-dev`), build (`.next`), check (`.next-build`)
- `npm run build:check` — verify build without stopping dev server
- `npm run dev:fresh` and `prebuild` guard against cache corruption
- Frontend dev default port 3001; README documents dev vs build workflow

## [0.1.0-pilot] — 2026-06-18

### Commercial Pilot Readiness

#### Buyer Demo Package
- Added `docs/demo-script.md` — 20-minute buyer demo script
- Added `docs/buyer-demo-narrative.md` — positioning and objection handling
- Added `docs/demo-personas.md` — analyst, manager, client personas
- Added `docs/demo-data-dictionary.md` — seed data reference

#### Microsoft Sentinel Integration
- Added `POST /integrations/sentinel/alerts` — Sentinel alert ingestion
- Added `GET /integrations/sentinel/health` — integration health check
- Added `docs/integrations/sentinel.md` and `samples/sentinel-alert-payload.json`
- Added `tests/test_sentinel.py`

#### Trust Metrics v2
- Added Trust Calibration Score with transparent formula
- Added metrics: high/low confidence decisions, disagreement by severity, override categories, QA reversal rate, QA-confirmed override accuracy
- Updated Trust Metrics UI with explanatory text

#### Client Value Report v2
- Upgraded report template with Service Activity, AI-Assisted Triage Oversight, Trust Metrics Summary, Value Delivered, Next Month Focus
- Shared report content component for detail and preview pages
- Print/PDF export via browser print on preview page
- Added `tests/test_report_visibility.py`

#### Pilot Deployment
- Added `docs/deployment.md`, `docs/pilot-setup.md`, `docs/security-controls.md`
- Added `GET /ready` and `GET /version` health endpoints
- Added `DEPLOYMENT_MODE`, `APP_VERSION`, `SENTINEL_API_KEY` env vars

#### Admin Setup
- Added `backend/scripts/pilot_setup.py` CLI for org/client/user/demo case setup

### Pilot Readiness (Previous)

- Golden path demo with CASE-GOLDEN
- Three-panel case workspace
- Trust Metrics dashboard
- Generic webhook ingestion
- Tenant isolation tests
- Client report preview and print view

### MVP (Initial)

- Multi-client case management
- AI-assisted triage
- Analyst decision capture
- SLA governance
- QA reviews
- Client dashboards and reports
- CSV alert import
