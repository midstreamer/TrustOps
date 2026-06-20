# TrustOps Known Limitations

**Release:** v0.2.1-pilot-admin

TrustOps v0.2.1 is a **pilot release** for SOCaaS and MDR providers. The following limitations are intentional or planned for post-pilot releases.

## Security & Compliance

- **Not SOC 2 certified yet** — suitable for pilot deployments with appropriate contractual controls.
- **No SSO/OIDC** — username/password authentication only.
- **No MFA** — rely on network, TLS, and strong passwords for pilot.

## Integrations

- **No full Sentinel bidirectional sync** — inbound alert ingestion only; no case status write-back to Sentinel.
- **No full ServiceNow/Jira bidirectional sync** — export summaries and manual ticket links only; no automated sync.
- **Environment-level webhook key** — deprecated for pilot/production; use per-client integration keys.

## Evidence & Attachments

- **Evidence storage is local-demo unless object storage is configured** — `backend/storage/evidence/` for local demo; pilot/production should use Azure Blob, S3, or equivalent.
- **No advanced evidence retention/legal hold** — standard database and filesystem retention applies.

## Automation Boundaries (By Design)

- **No automated containment actions** — analysts remain accountable for response decisions.
- **AI recommendations require human approval** — no autopilot disposition or closure.

## Reporting & Client Portal

- **Client report PDF uses browser Print / Save as PDF** — no server-side PDF generation engine.
- **Case quality scores are internal** — not exposed to client portal users by default.

## Operations

- **Seed script runs on empty database only** — upgrades use migrations, not re-seed.
- **Mock AI when `OPENAI_API_KEY` is unset** — demos only; use live AI for production pilots.
- **Demo reset is local-demo only** — destructive reset blocked in pilot and production modes.

## Metrics

- **Trust Calibration Score is operational** — not a statistical certification of AI accuracy.

For pilot deployment guidance, see [pilot-launch-runbook.md](pilot-launch-runbook.md).
