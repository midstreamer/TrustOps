# Microsoft Sentinel Integration

TrustOps accepts Microsoft Sentinel alerts via a dedicated ingestion endpoint. Sentinel detects and enriches; TrustOps creates the case and manages analyst workflow.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/integrations/sentinel/health` | Integration health check |
| `POST` | `/integrations/sentinel/alerts` | Ingest Sentinel alert → create case |
| `GET` | `/integrations/logs` | Recent ingestion events (Manager roles) |

## Authentication

All ingestion requests require:

```
X-TrustOps-Webhook-Key: <WEBHOOK_API_KEY or SENTINEL_API_KEY>
```

Configure in `.env`:

```bash
WEBHOOK_API_KEY=your-secure-key
SENTINEL_API_KEY=optional-dedicated-sentinel-key
```

If `SENTINEL_API_KEY` is unset, the webhook key is used.

## Client ID Mapping

Each managed customer needs a TrustOps `client_id` (UUID). Copy from **Admin Setup → Integrations** or `GET /clients`.

Include this UUID in every Sentinel Logic App or playbook payload. Cases are created under the organization that owns the client.

## Alert Deduplication

TrustOps deduplicates alerts when `source_alert_id` is present:

- **Key:** `client_id` + `source_system` + `source_alert_id`
- **Sentinel:** `source_system` is always `Microsoft Sentinel`; use `systemAlertId` or `alertId`
- **Webhook:** use `source_system` from payload (or integration name as fallback)

On duplicate ingestion, the API returns **HTTP 200** with:

```json
{
  "case_id": "existing-uuid",
  "case_number": "CASE-00042",
  "client_id": "uuid",
  "status": "New",
  "duplicate": true,
  "ingestion_status": "duplicate"
}
```

No second case is created. A `duplicate_detected` event is logged.

## Payload Mapping

TrustOps accepts native Sentinel field names and maps them to cases:

| Sentinel Field | TrustOps Field |
|----------------|----------------|
| `displayName` / `alertDisplayName` | Case title |
| `description` / `alertDescription` | Description |
| `severity` | Severity (High/Medium/Low/Informational/Critical) |
| `systemAlertId` / `alertId` | `source_alert_id` |
| `tactics` | MITRE tactic |
| `techniques` | MITRE technique |
| `entities` (Account) | Username |
| `entities` (Host) | Asset name |
| `entities` (Ip) | Source IP |
| `endTimeUtc` / `startTimeUtc` | Detected at |
| Full payload | `raw_event` (JSON) |

`source_system` is always set to **Microsoft Sentinel**.

## Example Request

```bash
curl -X POST http://localhost:8001/integrations/sentinel/alerts \
  -H "Content-Type: application/json" \
  -H "X-TrustOps-Webhook-Key: dev-webhook-key-change-in-production" \
  -d @samples/sentinel-alert-payload.json
```

Replace `client_id` in the sample with your managed client UUID from Admin Setup.

## Response

**New case:**

```json
{
  "case_id": "uuid",
  "case_number": "CASE-00013",
  "client_id": "uuid",
  "status": "New",
  "duplicate": false,
  "ingestion_status": "created"
}
```

## Azure Logic App / Sentinel Playbook

1. Deploy the starter template: `samples/sentinel-logic-app-workflow.json`
2. Set parameters: `TrustOpsApiUrl`, `TrustOpsWebhookKey`, `TrustOpsClientId`
3. Connect the Azure Sentinel trigger in the Logic App designer
4. Map Sentinel fields to the JSON payload (template includes common mappings)
5. Verify with `GET /integrations/sentinel/health`
6. Monitor ingestion in **Admin Setup → Integrations → Event Log**

## Integration Event Log

Failed and successful ingestions are recorded in `integration_events`. Query via:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8001/integrations/logs?status=error&limit=20"
```

Filter by `client_id`, `status` (`success`, `duplicate`, `error`), or `integration_source` (`sentinel`, `webhook`).

## What Gets Created

On successful ingestion:

1. **Case** — status `New`
2. **Alert** — linked to case with mapped fields
3. **SLA events** — based on client SLA policy
4. **Case event** — "Alert Ingested via Sentinel"
5. **Audit log** — `sentinel_alert_ingested`
6. **Integration event** — `alert_ingested` with status `success`

## Error Responses

| Status | Cause |
|--------|-------|
| 401 | Missing or invalid API key |
| 400 | Missing title/displayName or invalid severity |
| 404 | `client_id` not found |
| 422 | Schema validation failure |

Validation and ingestion errors are logged to `integration_events` when the client exists.

## Tenant Isolation

Cases are created under the organization associated with `client_id`. Cross-tenant ingestion is rejected.

## Related

- Generic webhook: `POST /integrations/webhook/alerts`
- Sample payload: `samples/sentinel-alert-payload.json`
- Logic App template: `samples/sentinel-logic-app-workflow.json`
- Admin UI: `/app/admin/setup` → Integrations tab
- Demo script: `docs/demo-script.md`
