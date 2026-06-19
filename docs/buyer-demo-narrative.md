# Buyer Demo Narrative

## The Problem Buyers Feel

SOCaaS and MDR buyers struggle to answer three questions:

1. **Is my SOC actually working my cases well?**
2. **Can I trust AI-assisted triage without losing analyst accountability?**
3. **How do I prove service value to my board and security leadership?**

SIEMs detect. SOARs enrich. Neither is designed to be the system of record for managed SOC *work* — analyst decisions, SLA governance, QA, and client reporting.

## TrustOps Positioning

TrustOps is the **case platform and client value portal** for SOCaaS/MDR providers.

| Layer | Role |
|-------|------|
| SIEM (e.g. Sentinel) | Detects threats, generates alerts |
| SOAR | Enriches, automates response playbooks |
| **TrustOps** | Manages cases, captures human-AI decisions, governs SLA, proves value |

We do not replace Sentinel or SOAR. We sit where the *work* happens and where the *client* sees outcomes.

## Demo Story Arc: Apex Energy

**Apex Energy** is a premium-tier energy client. A suspicious OAuth consent grant alert fires in Microsoft Defender / Sentinel.

### Scene 1 — The Analyst (`analyst1@trustops.demo`)

Alex opens **CASE-GOLDEN** in the TrustOps case workspace. The three-panel layout mirrors how analysts actually work:

- **Left:** What happened (alert, evidence, SLA clocks, timeline)
- **Center:** Investigation and the analyst decision (human accountable)
- **Right:** AI triage assistant (recommendation, not autopilot)

Alex generates an AI recommendation, reviews confidence and disposition, then submits a decision — accepted or modified with a documented override reason. TrustOps records human-AI agreement.

*Buyer takeaway:* AI accelerates triage; analysts remain accountable.

### Scene 2 — The Manager (`manager@trustops.demo`)

Jordan reviews the **Manager Dashboard** and **Trust Metrics** — filtered to Apex and the current reporting period. The Trust Calibration Score gives an operational read on human-AI alignment — transparently defined, not oversold as "AI accuracy." Weekly trend charts support QBR conversations.

Jordan performs QA on a completed case, then generates and publishes Apex's monthly client report. If AI content needs a refresh, Jordan regenerates the report before publishing.

*Buyer takeaway:* Operational governance and quality review are built in.

### Scene 3 — The Client (`client@apex.demo`)

Apex's security lead logs into the **Client Dashboard**. The **SOC Workflow Funnel** shows how alerts progressed through triage, investigation, and confirmed incidents — with trends over the selected period.

While reviewing SLA performance and open cases, they use the **SOC Assistant** in the right-hand sidebar to ask questions about their data — for example, SLA performance or funnel summary — without filing a ticket or waiting for a monthly call.

They read the **published report** — executive summary, SLA performance, notable cases, AI-assisted triage oversight, and value delivered. No internal QA notes. No raw AI prompts. No other clients' data.

*Buyer takeaway:* The portal proves service value interactively, not just in a static PDF.

### Scene 4 — Sentinel Integration

A Sentinel alert arrives via `POST /integrations/sentinel/alerts`. TrustOps creates a case, alert, SLA events, and audit trail — ready for analyst workflow. Duplicate replays of the same alert are deduplicated. Managers can review ingestion events in Admin Setup.

*Buyer takeaway:* First named integration connects detection to case management without building another SIEM.

## Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have a SIEM." | Correct — TrustOps doesn't replace it. We manage the case work SIEMs don't own. |
| "We use AI in our SOC already." | TrustOps captures analyst decisions *against* AI recommendations and measures trust calibration. |
| "Our clients want better reporting." | Published client reports include SLA, notable cases, and AI oversight — client-safe by design. |
| "Can we trust the AI score?" | Trust Calibration is an operational indicator with a published formula — not a statistical certification. |
| "Clients still call us for status updates." | The Client Dashboard funnel and SOC Assistant let clients self-serve answers grounded in their live data. |

## Pilot Ask

Deploy TrustOps in `pilot-single-tenant` mode for one provider org with 1–3 clients. Run the golden path weekly. Review Trust Metrics and client reports after 30 days.

**v0.2 pilot focus:** Connect Sentinel for one client, publish one report per client per month, and have the client security lead use the dashboard funnel and SOC Assistant at least once before the 30-day QBR.
