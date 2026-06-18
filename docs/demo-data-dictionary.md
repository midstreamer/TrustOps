# Demo Data Dictionary

Reference for seed data used in TrustOps buyer demos.

## Organization

| Field | Value |
|-------|-------|
| Name | TrustOps Demo SOC |
| Status | active |

## Clients

| Name | Industry | Tier | Demo Use |
|------|----------|------|----------|
| Apex Energy | Energy | Premium | Primary demo client (CASE-GOLDEN, published report) |
| Riverbend Health | Healthcare | Standard | Tenant isolation demos |
| Metro County IT | Government | Standard | Multi-client queue demos |

## Golden Path Case

| Field | Value |
|-------|-------|
| Case Number | CASE-GOLDEN |
| Client | Apex Energy |
| Title | [DEMO] Suspicious OAuth consent grant |
| Severity | High |
| Priority | P2 High |
| Status | New (no AI rec or decision pre-seeded) |
| Assigned To | analyst1@trustops.demo |
| Source | Microsoft Defender |
| MITRE | Persistence / T1098 |
| Asset | O365-TENANT |
| User | finance.admin |

## Seed Case Portfolio (CASE-00001 – CASE-00012)

| Range | Purpose |
|-------|---------|
| 1–6 | Cases with AI recommendations and analyst decisions (trust metrics data) |
| 3 | Includes QA review |
| 7–12 | Varied statuses, SLA states (At Risk, Breached) |
| Various | Mix of Apex, Riverbend, Metro clients |

## Users

| Email | Role | Client Scope |
|-------|------|--------------|
| admin@trustops.demo | Platform Admin | All |
| manager@trustops.demo | SOC Manager | All provider cases |
| analyst1@trustops.demo | SOC Analyst | All (CASE-GOLDEN assigned) |
| analyst2@trustops.demo | SOC Analyst | All |
| client@apex.demo | Client Admin | Apex only |
| viewer@apex.demo | Client Viewer | Apex only |

**Password (all):** `TrustOps123!`

## Published Report

| Field | Value |
|-------|-------|
| Title | Apex Energy Monthly SOC Report (Pilot) |
| Status | Published |
| Client | Apex Energy |
| Sections | Executive summary, case volume, SLA, notable incidents, themes, recommendations, human-AI summary |

## SLA Policies (per client)

| Severity | Time to Triage | Time to Disposition |
|----------|----------------|---------------------|
| Critical | 15 min | 60 min |
| High | 30 min | 120 min |

## Trust Metrics Seed Sources

Trust Metrics v2 aggregates from `analyst_decisions` and `ai_recommendations` on seed cases 1–6:
- AI acceptance, modification, rejection rates
- Human-AI agreement
- Override counts by analyst and disposition
- Trust Calibration Score components

## Integration Test Data

| Integration | Endpoint | Sample |
|-------------|----------|--------|
| Generic webhook | `POST /integrations/webhook/alerts` | See `docs/demo-flow.md` |
| Microsoft Sentinel | `POST /integrations/sentinel/alerts` | `samples/sentinel-alert-payload.json` |

## Fields Clients Never See

- `CaseNote` with visibility = Internal
- `QAReview` records
- `AIRecommendation.raw_prompt` / `raw_response`
- Draft reports
- Other clients' cases and dashboards
