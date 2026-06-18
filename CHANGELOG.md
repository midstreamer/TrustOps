# Changelog

All notable changes to TrustOps are documented here.

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
