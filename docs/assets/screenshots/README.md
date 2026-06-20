# TrustOps Screenshot Capture Guide

Add PNG screenshots to this folder for README and buyer materials.

## Required captures

| File | Page | Login | What to show |
|------|------|-------|--------------|
| `case-workspace.png` | `/app/cases/{caseId}` | `analyst1@trustops.demo` | Three-panel layout, AI recommendation, SLA |
| `trust-metrics.png` | `/app/trust-metrics` | `manager@trustops.demo` | Calibration score, filters, weekly trends |
| `client-report.png` | `/app/reports/{id}/preview` | `manager@trustops.demo` | Published report preview, print-ready |
| `integration-health.png` | `/app/integrations` | `manager@trustops.demo` | Sentinel + webhook status cards |
| `audit-log.png` | `/app/audit` | `manager@trustops.demo` | Filter bar and audit event table |

**Password:** `TrustOps123!`

## Tips

- Use 1440×900 or 1280×800 viewport
- Dark theme (default)
- Hide browser chrome if possible
- Run `npm run dev` on port 3001 with seed data loaded

After capture, images are referenced from [README.md](../../README.md) and [product-brief.md](../../product-brief.md).
