# TrustOps Security Controls

Security model for pilot and commercial deployment.

## Authentication

- **JWT tokens** (HS256) with configurable expiry (`JWT_EXPIRE_MINUTES`)
- **bcrypt** password hashing
- Tokens required on all `/cases`, `/dashboards`, `/reports` endpoints

## Authorization (RBAC)

| Role | Scope |
|------|-------|
| Platform Admin | Full org access, settings |
| SOC Manager | All provider cases, QA, reports, trust metrics |
| SOC Analyst | Assigned and org cases (per policy) |
| Client Admin | Own client dashboard and published reports |
| Client Viewer | Read-only client access |

## Tenant Isolation

- All data scoped by `organization_id`
- Client users restricted to `client_id`
- Cross-client access returns **403**
- Verified by `tests/test_tenant_isolation.py`

## Client Data Boundaries

Client users **cannot** access:

| Resource | Control |
|----------|---------|
| Internal notes | Filtered by `visibility != Internal` |
| QA reviews | Endpoint returns 403 |
| AI raw prompts/responses | Endpoint returns 403 |
| Draft reports | Filtered; direct access returns 403 |
| Other clients' cases | Filtered by `client_id` |

Verified by `tests/test_report_visibility.py` and tenant isolation tests.

## Integration Security

- Webhook and Sentinel endpoints require `X-TrustOps-Webhook-Key`
- Keys must be rotated for production (`WEBHOOK_API_KEY`, optional `SENTINEL_API_KEY`)
- Invalid key returns **401**
- `client_id` in payload must exist; unknown client returns **404**

## Audit Logging

Events logged for:

- Case creation
- AI recommendation generation
- Analyst decision submission
- QA review
- Report publishing
- Webhook/Sentinel alert ingestion

## Transport

- **Production:** TLS required on all endpoints (reverse proxy)
- **CORS:** Restrict `CORS_ORIGINS` to known frontend domains

## Secrets Management

| Secret | Storage |
|--------|---------|
| `JWT_SECRET` | Environment variable / secrets manager |
| `WEBHOOK_API_KEY` | Environment variable / secrets manager |
| `DATABASE_URL` | Environment variable / secrets manager |
| `OPENAI_API_KEY` | Environment variable (optional) |

Never commit `.env` to version control.

## AI Data Handling

- AI prompts and responses stored internally for audit
- **Not exposed** to client users
- Client reports include AI oversight *summary* only
- Mock AI mode available when `OPENAI_API_KEY` is unset (demos)

## Deployment Hardening (Pilot)

- [ ] Change all default passwords and secrets
- [ ] Set `DEPLOYMENT_MODE=pilot-single-tenant` or `pilot-multi-client`
- [ ] Enable TLS
- [ ] Restrict CORS to production frontend URL
- [ ] Configure database backups
- [ ] Rotate webhook API keys per integration
- [ ] Review audit logs weekly

## Vulnerability Reporting

Report security issues to your TrustOps deployment administrator. Do not disclose publicly before remediation.
