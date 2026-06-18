# Microsoft Sentinel Integration

TrustOps accepts Microsoft Sentinel alerts via a dedicated ingestion endpoint. Sentinel detects and enriches; TrustOps creates the case and manages analyst workflow.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/integrations/sentinel/health` | Integration health check |
| `POST` | `/integrations/sentinel/alerts` | Ingest Sentinel alert → create case |

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

Replace `client_id` in the sample with your Apex Energy client UUID from `GET /clients`.

## Response

```json
{
  "case_id": "uuid",
  "case_number": "CASE-00013",
  "client_id": "uuid",
  "status": "New"
}
```

## Azure Logic App / Sentinel Playbook

1. Create a Logic App triggered by Sentinel incident or alert creation
2. Map Sentinel fields to the JSON payload above
3. Include `client_id` for the TrustOps client (one UUID per managed customer)
4. POST to your TrustOps API URL with the API key header
5. Verify with `GET /integrations/sentinel/health`

## What Gets Created

On successful ingestion:

1. **Case** — status `New`
2. **Alert** — linked to case with mapped fields
3. **SLA events** — based on client SLA policy
4. **Case event** — "Alert Ingested via Sentinel"
5. **Audit log** — `sentinel_alert_ingested`

## Error Responses

| Status | Cause |
|--------|-------|
| 401 | Missing or invalid API key |
| 400 | Missing title/displayName or invalid severity |
| 404 | `client_id` not found |
| 422 | Schema validation failure |

## Tenant Isolation

Cases are created under the organization associated with `client_id`. Cross-tenant ingestion is rejected.

## Related

- Generic webhook: `POST /integrations/webhook/alerts`
- Sample payload: `samples/sentinel-alert-payload.json`
- Demo script: `docs/demo-script.md`
