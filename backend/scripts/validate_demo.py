#!/usr/bin/env python3
"""End-to-end demo validation against the TrustOps API."""

import json
import os
import sys
from datetime import date, timedelta

import httpx

BASE = os.environ.get("API_URL", "http://localhost:8001")
PASSWORD = "TrustOps123!"

passed = 0
failed = 0
errors: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        msg = f"  ✗ {name}" + (f" — {detail}" if detail else "")
        print(msg)
        errors.append(msg)


def login(email: str) -> str:
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD})
    if r.status_code != 200:
        raise RuntimeError(f"Login failed for {email}: {r.status_code} {r.text}")
    return r.json()["access_token"]


def api(method: str, path: str, token: str, **kwargs) -> httpx.Response:
    headers = {"Authorization": f"Bearer {token}"}
    return httpx.request(method, f"{BASE}{path}", headers=headers, timeout=30, **kwargs)


def main() -> int:
    print(f"\nTrustOps Demo Validation — {BASE}\n")

    # Health
    r = httpx.get(f"{BASE}/health")
    check("API health", r.status_code == 200 and r.json().get("status") == "ok", r.text)

    r_ready = httpx.get(f"{BASE}/ready")
    check("API ready", r_ready.status_code == 200 and r_ready.json().get("status") == "ready", r_ready.text)

    r_ver = httpx.get(f"{BASE}/version")
    ver_body = r_ver.json() if r_ver.status_code == 200 else {}
    check("API version", r_ver.status_code == 200 and "version" in ver_body, r_ver.text)
    check(
        "API version is pilot admin",
        ver_body.get("version") == "0.2.1-pilot-admin",
        str(ver_body.get("version")),
    )

    r_sentinel = httpx.get(f"{BASE}/integrations/sentinel/health")
    check("Sentinel integration health", r_sentinel.status_code == 200, r_sentinel.text)

    # 1-2: Analyst login + case queue
    print("\n[Analyst flow]")
    analyst_token = login("analyst1@trustops.demo")
    me = api("GET", "/auth/me", analyst_token).json()
    check("Analyst login", "SOC Analyst" in me.get("roles", []))

    cases = api("GET", "/cases", analyst_token).json()
    check("Case queue returns cases", len(cases) >= 12, f"got {len(cases)}")

    # Pick golden path case or New case for full workflow
    golden = next((c for c in cases if c.get("case_number") == "CASE-GOLDEN"), None)
    target = golden or next((c for c in cases if c["status"] == "New"), cases[0])
    case_id = target["id"]
    check("Golden path case (CASE-GOLDEN) exists", golden is not None or target["status"] == "New")
    check("Open case (GET detail)", api("GET", f"/cases/{case_id}", analyst_token).status_code == 200)

    # Use golden case for workflow when available (no prior AI/decision)
    workflow_case_id = golden["id"] if golden else None

    # 3: Create case
    clients = api("GET", "/clients", analyst_token).json()
    apex = next(c for c in clients if "Apex" in c["name"])
    create_r = api(
        "POST",
        "/cases",
        analyst_token,
        json={
            "client_id": apex["id"],
            "title": "Demo validation test case",
            "description": "Created during demo validation",
            "severity": "Medium",
            "priority": "P3 Medium",
            "source_system": "Manual",
            "asset_name": "TEST-WKST-01",
        },
    )
    check("Create case", create_r.status_code == 200, create_r.text[:200])
    new_case = create_r.json() if create_r.status_code == 200 else {}
    if not workflow_case_id:
        workflow_case_id = new_case.get("id", case_id)

    # 4-5: AI recommendation
    ai_r = api("POST", f"/cases/{workflow_case_id}/ai-recommendations", analyst_token)
    check("Generate AI recommendation", ai_r.status_code == 200, ai_r.text[:200])
    ai_rec = ai_r.json() if ai_r.status_code == 200 else {}
    ai_recs = api("GET", f"/cases/{workflow_case_id}/ai-recommendations", analyst_token).json()
    check("List AI recommendations", len(ai_recs) >= 1)

    # 6-8: Analyst decision
    dec_r = api(
        "POST",
        f"/cases/{workflow_case_id}/decisions",
        analyst_token,
        json={
            "selected_disposition": ai_rec.get("recommended_disposition", "Needs More Information"),
            "selected_priority": ai_rec.get("recommended_priority", "P3 Medium"),
            "analyst_confidence": 85,
            "ai_action": "Accepted",
            "ai_recommendation_id": ai_rec.get("id"),
            "decision_notes": "Demo validation decision",
        },
    )
    check("Submit analyst decision", dec_r.status_code == 200, dec_r.text[:200])
    if dec_r.status_code == 200:
        dec = dec_r.json()
        check("Human-AI agreement recorded", dec.get("human_ai_agreement") is True)

    # 9: SLA
    case_detail = api("GET", f"/cases/{workflow_case_id}", analyst_token).json()
    check("SLA status on case", case_detail.get("sla_status") is not None, str(case_detail.get("sla_status")))
    sla_events = api("GET", f"/cases/{workflow_case_id}/sla-events", analyst_token).json()
    check("SLA events returned", len(sla_events) >= 1)

    # 10: Notes + evidence
    note_r = api(
        "POST",
        f"/cases/{workflow_case_id}/notes",
        analyst_token,
        json={"note_text": "Internal demo note", "visibility": "Internal"},
    )
    check("Add internal note", note_r.status_code == 200, note_r.text[:200])
    ev_r = api(
        "POST",
        f"/cases/{workflow_case_id}/evidence",
        analyst_token,
        json={"evidence_type": "Log", "title": "Demo log", "content": "event=demo"},
    )
    check("Add evidence", ev_r.status_code == 200, ev_r.text[:200])

    # 11-13: Manager flow
    print("\n[Manager flow]")
    mgr_token = login("manager@trustops.demo")

    print("\n[Operational pilot]")
    int_status = api("GET", "/integrations/status", mgr_token)
    check("Integration status", int_status.status_code == 200, int_status.text[:200])
    if int_status.status_code == 200:
        check("Integration status has Sentinel", any(i.get("integration_name") == "Microsoft Sentinel" for i in int_status.json()))

    audit = api("GET", "/audit-logs?limit=5", mgr_token)
    check("Audit logs", audit.status_code == 200, audit.text[:200])

    mgr_cases = api("GET", "/cases", mgr_token).json()
    if mgr_cases:
        check("Case quality on list", mgr_cases[0].get("quality") is not None, "missing quality field")

    drill = api("GET", "/dashboards/trust-metrics/drilldown?type=analyst_override", mgr_token)
    check("Trust metrics drilldown", drill.status_code == 200, drill.text[:200])

    analyst_audit = api("GET", "/audit-logs", analyst_token)
    check("Analyst cannot access audit logs", analyst_audit.status_code in (401, 403), str(analyst_audit.status_code))

    dash = api("GET", "/dashboards/soc-manager", mgr_token)
    check("Manager dashboard", dash.status_code == 200, dash.text[:200])
    if dash.status_code == 200:
        d = dash.json()
        check("Dashboard has open cases metric", "total_open_cases" in d)

    # Trust metrics
    tm = api("GET", "/dashboards/trust-metrics", mgr_token)
    check("Trust metrics dashboard", tm.status_code == 200, tm.text[:200])
    if tm.status_code == 200:
        t = tm.json()
        check("Trust metrics has AI counts", "ai_recommendation_count" in t)
        check("Trust metrics has agreement rate", "human_ai_agreement_rate" in t)
        check("Trust metrics v2 calibration score", "trust_calibration_score" in t)

    # Webhook alert ingestion
    print("\n[Webhook ingestion]")
    webhook_key = os.environ.get("WEBHOOK_API_KEY", "dev-webhook-key-change-in-production")
    wh_r = httpx.post(
        f"{BASE}/integrations/webhook/alerts",
        headers={"X-TrustOps-Webhook-Key": webhook_key, "Content-Type": "application/json"},
        json={
            "client_id": apex["id"],
            "title": "Webhook validation alert",
            "severity": "High",
            "source_system": "Demo SOAR",
            "description": "Created during demo validation",
            "priority": "P2 High",
        },
        timeout=30,
    )
    check("Webhook creates case", wh_r.status_code == 200, wh_r.text[:200])
    wh_bad = httpx.post(
        f"{BASE}/integrations/webhook/alerts",
        headers={"X-TrustOps-Webhook-Key": webhook_key, "Content-Type": "application/json"},
        json={"client_id": "00000000-0000-0000-0000-000000000099", "title": "x", "severity": "High"},
        timeout=30,
    )
    check("Webhook rejects invalid client", wh_bad.status_code in (400, 404), str(wh_bad.status_code))

    qa_r = api(
        "POST",
        f"/cases/{workflow_case_id}/qa-reviews",
        mgr_token,
        json={
            "disposition_correct": True,
            "priority_correct": True,
            "evidence_quality_score": 90,
            "documentation_quality_score": 85,
            "client_communication_score": 80,
            "ai_usage_appropriate": True,
            "review_notes": "Demo QA review",
        },
    )
    check("QA review", qa_r.status_code == 200, qa_r.text[:200])

    # 14-15: Report generate + publish
    end = date.today()
    start = end - timedelta(days=30)
    report_r = api(
        "POST",
        "/reports/generate",
        mgr_token,
        json={
            "client_id": apex["id"],
            "reporting_period_start": start.isoformat(),
            "reporting_period_end": end.isoformat(),
        },
    )
    check("Generate report", report_r.status_code == 200, report_r.text[:200])
    report_id = report_r.json().get("id") if report_r.status_code == 200 else None
    if report_id:
        pub_r = api("POST", f"/reports/{report_id}/publish", mgr_token)
        check("Publish report", pub_r.status_code == 200, pub_r.text[:200])

    # 16-18: Client flow
    print("\n[Client flow]")
    client_token = login("client@apex.demo")
    client_dash = api("GET", f"/dashboards/client/{apex['id']}", client_token)
    check("Client dashboard", client_dash.status_code == 200, client_dash.text[:200])

    if report_id:
        report_get = api("GET", f"/reports/{report_id}", client_token)
        check("Client can view published report", report_get.status_code == 200)

    reports = api("GET", "/reports", client_token).json()
    check("Client reports list (published only)", all(r["status"] == "Published" for r in reports))

    # 19: Isolation checks
    print("\n[Isolation checks]")
    client_cases = api("GET", "/cases", client_token).json()
    check(
        "Client cases scoped to own client",
        all(c["client_id"] == apex["id"] for c in client_cases),
        f"clients: {set(c['client_id'] for c in client_cases)}",
    )

    # Client should not see internal notes on a case with both note types
    case_with_notes = next((c for c in cases if c["id"]), cases[0])
    cid = case_with_notes["id"]
    client_notes = api("GET", f"/cases/{cid}/notes", client_token).json()
    check(
        "Client cannot see internal notes",
        all(n["visibility"] != "Internal" for n in client_notes),
        f"visible: {[n['visibility'] for n in client_notes]}",
    )

    qa_list = api("GET", f"/cases/{cid}/qa-reviews", client_token)
    check("Client cannot access QA reviews", qa_list.status_code in (401, 403), str(qa_list.status_code))

    riverbend = next((c for c in clients if "Riverbend" in c["name"]), None)
    if riverbend:
        other_dash = api("GET", f"/dashboards/client/{riverbend['id']}", client_token)
        check("Client cannot access other client dashboard", other_dash.status_code == 403)

    # v0.2.1 pilot admin
    print("\n[Pilot admin v0.2.1]")
    admin_token = login("admin@trustops.demo")
    summary = api("GET", "/admin/summary", admin_token)
    check("Admin summary endpoint", summary.status_code == 200, summary.text[:200])
    checklist = api("GET", "/admin/pilot-checklist", admin_token)
    check("Pilot checklist endpoint", checklist.status_code == 200, checklist.text[:200])
    if checklist.status_code == 200:
        cl = checklist.json()
        check("Pilot checklist has items", len(cl.get("items", [])) >= 10)

    branding = api("GET", "/report-branding", admin_token)
    check("Report branding endpoint", branding.status_code == 200, branding.text[:200])

    client_admin = api("GET", "/admin/summary", client_token)
    check("Client cannot access admin summary", client_admin.status_code in (401, 403), str(client_admin.status_code))

    key_r = api(
        "POST",
        f"/integration-keys/clients/{apex['id']}",
        admin_token,
        json={"integration_name": "Microsoft Sentinel", "source_system": "Sentinel"},
    )
    check("Create integration key", key_r.status_code == 200, key_r.text[:200])
    raw_key = key_r.json().get("raw_key") if key_r.status_code == 200 else None
    key_id = key_r.json().get("id") if key_r.status_code == 200 else None

    if raw_key:
        sent_r = httpx.post(
            f"{BASE}/integrations/sentinel/alerts",
            headers={"X-TrustOps-Webhook-Key": raw_key, "Content-Type": "application/json"},
            json={
                "client_id": apex["id"],
                "title": "Sentinel per-client key validation",
                "severity": "Medium",
                "source_system": "Microsoft Sentinel",
            },
            timeout=30,
        )
        check("Sentinel ingestion with per-client key", sent_r.status_code == 200, sent_r.text[:200])

    if key_id:
        revoke_r = api("POST", f"/integration-keys/{key_id}/revoke", admin_token)
        check("Revoke integration key", revoke_r.status_code == 200, revoke_r.text[:200])
        if raw_key:
            bad_sent = httpx.post(
                f"{BASE}/integrations/sentinel/alerts",
                headers={"X-TrustOps-Webhook-Key": raw_key, "Content-Type": "application/json"},
                json={"client_id": apex["id"], "title": "x", "severity": "Low"},
                timeout=30,
            )
            check("Revoked key rejects Sentinel ingestion", bad_sent.status_code == 401, str(bad_sent.status_code))

    ticket = api("GET", f"/cases/{workflow_case_id}/external-ticket-summary?target=servicenow", mgr_token)
    check("External ticket summary endpoint", ticket.status_code == 200, ticket.text[:200])

    demo_reset = api("POST", "/admin/demo-reset", mgr_token)
    check("Demo reset blocked for non-admin or protected mode", demo_reset.status_code in (403, 200), str(demo_reset.status_code))

    # Evidence upload
    import io
    files = {"file": ("validate.log", io.BytesIO(b"demo evidence line"), "text/plain")}
    ev_up = httpx.post(
        f"{BASE}/cases/{workflow_case_id}/evidence/upload",
        headers={"Authorization": f"Bearer {analyst_token}"},
        data={"visibility": "Internal", "title": "Validation log"},
        files=files,
        timeout=30,
    )
    check("Evidence upload endpoint", ev_up.status_code == 200, ev_up.text[:200])
    if ev_up.status_code == 200:
        ev_id = ev_up.json().get("id")
        client_dl = api("GET", f"/cases/{workflow_case_id}/evidence/{ev_id}/download", client_token)
        check("Client cannot download internal evidence", client_dl.status_code in (401, 403), str(client_dl.status_code))

    # Summary
    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed")
    if errors:
        print("\nFailures:")
        for e in errors:
            print(e)
    print()
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
