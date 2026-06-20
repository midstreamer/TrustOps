# TrustOps Known Limitations

**Release:** v0.2.0-operational-pilot

TrustOps v0.2.0 is a **pilot release** for SOCaaS and MDR providers. The following limitations are intentional or planned for post-pilot releases.

## Security & Compliance

- **Not SOC 2 certified yet** — suitable for pilot deployments with appropriate contractual controls.
- **No SSO/OIDC** — username/password authentication only.
- **No MFA** — rely on network, TLS, and strong passwords for pilot.

## Integrations

- **No per-client integration key rotation** — single `WEBHOOK_API_KEY` (optional dedicated `SENTINEL_API_KEY`).
- **No full Sentinel bidirectional sync** — inbound alert ingestion only; no case status write-back to Sentinel.
- **No ServiceNow/Jira sync** — case work stays in TrustOps for pilot scope.

## Evidence & Attachments

- **No file evidence uploads** — text/log evidence only.
- **No advanced evidence retention controls** — standard database retention applies.

## Automation Boundaries (By Design)

- **No automated containment actions** — analysts remain accountable for response decisions.
- **AI recommendations require human approval** — no autopilot disposition or closure.

## Reporting & Client Portal

- **Client report PDF uses browser Print / Save as PDF** — no server-side PDF generation or branding engine.
- **Case quality scores are internal** — not exposed to client portal users by default.

## Operations

- **Seed script runs on empty database only** — upgrades use migrations, not re-seed.
- **Mock AI when `OPENAI_API_KEY` is unset** — demos only; use live AI for production pilots.

## Metrics

- **Trust Calibration Score is operational** — not a statistical certification of AI accuracy.

For pilot deployment guidance, see [pilot-launch-runbook.md](pilot-launch-runbook.md).
