# TrustOps Product Brief

## What TrustOps Is

TrustOps is a **human-in-the-loop SOC case management platform** and **client value portal** for SOCaaS and MDR providers.

> The SIEM detects. The SOAR enriches. The case platform manages the work. The portal proves the service value.

TrustOps is the operational system of record for managed SOC **work** — analyst decisions, SLA governance, QA, and client reporting. It does not replace your SIEM, SOAR, EDR, or XDR.

## Who It Is For

| Buyer | Role |
|-------|------|
| SOCaaS / MDR providers | Run cases, govern quality, prove value to clients |
| SOC managers | SLA oversight, Trust Metrics, QA, monthly reports |
| SOC analysts | Three-panel workspace with AI-assisted triage |
| Client security leads | Dashboard, workflow funnel, SOC Assistant, published reports |

## Problem Solved

MDR buyers struggle to answer:

1. Is my SOC working cases well?
2. Can I trust AI-assisted triage without losing accountability?
3. How do I prove service value to leadership?

SIEMs detect. SOARs enrich. Neither owns analyst workflow, human-AI decisions, or client-safe reporting. TrustOps does.

## Core Capabilities (v0.2.1-pilot-admin)

- Multi-client case lifecycle with tenant isolation
- Three-panel analyst workspace with AI triage and decision capture
- Trust Metrics v2 with calibration score and **actionable drilldown**
- **Integration health dashboard** (Sentinel + webhook)
- **Audit log viewer** for managers
- **Case quality score** and flags for incomplete cases
- **Pilot Admin Console** — clients, users, integration keys, branding, checklist
- **Per-client integration keys** with rotation and revocation
- **Report branding** and **controlled evidence file uploads**
- **ServiceNow/Jira export stubs** for case handoff
- Client workflow funnel, SOC Assistant, and Value Report v2
- Microsoft Sentinel ingestion with deduplication

## Why Now

AI-assisted SOC triage is accelerating, but buyers demand **accountability** and **proof**. TrustOps captures analyst decisions against AI recommendations and gives clients an interactive value portal — not another SIEM license.

## Pilot Offer

Deploy in `pilot-single-tenant` mode for one provider with 1–3 clients for **30 days**. Run the golden path weekly; review Trust Metrics and publish one report per client.

See [pilot-launch-runbook.md](pilot-launch-runbook.md) and [pilot-success-scorecard.md](pilot-success-scorecard.md).

## Target Buyer

SOCaaS and MDR practices (50–500 analysts) that:

- Use Microsoft Sentinel or generic webhook/SOAR ingestion
- Need client-facing reporting beyond PDF slide decks
- Want human-AI trust metrics without overselling “AI accuracy”

## Demo Flow (22 min)

1. **Analyst** — CASE-GOLDEN, AI recommendation, analyst decision
2. **Manager** — Trust Metrics drilldown, QA, report publish
3. **Client** — Workflow funnel, SOC Assistant, published report
4. **Integration** — Sentinel health and ingestion

Full script: [demo-script.md](demo-script.md)

## Screenshots

| View | Path |
|------|------|
| Case workspace | `docs/assets/screenshots/case-workspace.png` |
| Trust Metrics | `docs/assets/screenshots/trust-metrics.png` |
| Client report | `docs/assets/screenshots/client-report.png` |
| Integration health | `docs/assets/screenshots/integration-health.png` |
| Audit log | `docs/assets/screenshots/audit-log.png` |

Capture instructions: [docs/assets/screenshots/README.md](assets/screenshots/README.md)
