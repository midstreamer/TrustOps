"""Seed demo data for TrustOps MVP."""

import uuid
from datetime import date, datetime, timedelta, timezone

from app.auth.security import hash_password
from app.core.constants import DEFAULT_PASSWORD, ROLES
from app.db.session import SessionLocal
from app.models import (
    AIRecommendation,
    Alert,
    AnalystDecision,
    Case,
    CaseEvent,
    CaseEvidence,
    CaseNote,
    Client,
    Organization,
    QAReview,
    Role,
    SLAPolicy,
    SLAEvent,
    User,
    UserRole,
)
from app.services.sla_service import SLAService

NOW = datetime.now(timezone.utc)


def seed():
    db = SessionLocal()
    try:
        if db.query(Organization).first():
            print("Database already seeded. Drop tables first to re-seed.")
            return

        org = Organization(name="TrustOps Demo SOC", status="active")
        db.add(org)
        db.flush()

        clients_data = [
            ("Apex Energy", "Energy", "Premium"),
            ("Riverbend Health", "Healthcare", "Standard"),
            ("Metro County IT", "Government", "Standard"),
        ]
        clients = {}
        for name, industry, tier in clients_data:
            c = Client(
                organization_id=org.id,
                name=name,
                industry=industry,
                service_tier=tier,
                primary_contact_email=f"contact@{name.lower().replace(' ', '')}.local",
            )
            db.add(c)
            db.flush()
            clients[name] = c
            db.add(
                SLAPolicy(
                    client_id=c.id,
                    severity="Critical",
                    time_to_triage_minutes=15,
                    time_to_disposition_minutes=60,
                    time_to_notify_minutes=30,
                    time_to_close_minutes=480,
                )
            )
            db.add(
                SLAPolicy(
                    client_id=c.id,
                    severity="High",
                    time_to_triage_minutes=30,
                    time_to_disposition_minutes=120,
                    time_to_notify_minutes=60,
                    time_to_close_minutes=720,
                )
            )

        roles = {}
        for name in ROLES:
            r = Role(name=name, description=f"{name} role")
            db.add(r)
            db.flush()
            roles[name] = r

        def add_user(email, name, role_name, client=None):
            u = User(
                organization_id=org.id,
                client_id=client.id if client else None,
                name=name,
                email=email,
                password_hash=hash_password(DEFAULT_PASSWORD),
            )
            db.add(u)
            db.flush()
            db.add(UserRole(user_id=u.id, role_id=roles[role_name].id))
            return u

        admin = add_user("admin@trustops.demo", "Platform Admin", "Platform Admin")
        manager = add_user("manager@trustops.demo", "SOC Manager", "SOC Manager")
        analyst1 = add_user("analyst1@trustops.demo", "Alex Analyst", "SOC Analyst")
        analyst2 = add_user("analyst2@trustops.demo", "Sam Analyst", "SOC Analyst")
        client_admin = add_user(
            "client@apex.demo", "Apex Client Admin", "Client Admin", clients["Apex Energy"]
        )

        cases_spec = [
            {
                "client": "Apex Energy",
                "title": "Multiple failed logins followed by success from unusual geography",
                "severity": "High",
                "priority": "P2 High",
                "status": "Investigating",
                "source": "Microsoft Entra ID",
                "asset": "VPN-GW-01",
                "user": "jsmith",
                "src_ip": "203.0.113.45",
                "dst_ip": "10.1.2.50",
                "mitre_t": "Credential Access",
                "mitre_te": "T1110 - Brute Force",
                "analyst": analyst1,
            },
            {
                "client": "Riverbend Health",
                "title": "Endpoint malware blocked by EDR",
                "severity": "Critical",
                "priority": "P1 Critical",
                "status": "Contained",
                "source": "CrowdStrike",
                "asset": "WS-HR-4421",
                "user": "mwilson",
                "src_ip": "10.20.5.88",
                "mitre_t": "Execution",
                "mitre_te": "T1059 - Command and Scripting Interpreter",
                "analyst": analyst2,
            },
            {
                "client": "Metro County IT",
                "title": "Suspicious PowerShell execution",
                "severity": "High",
                "priority": "P2 High",
                "status": "Triaged",
                "source": "Sentinel",
                "asset": "SRV-DC-02",
                "user": "svc_backup",
                "mitre_t": "Execution",
                "mitre_te": "T1059.001 - PowerShell",
                "analyst": analyst1,
            },
            {
                "client": "Apex Energy",
                "title": "Impossible travel login detected",
                "severity": "Medium",
                "priority": "P3 Medium",
                "status": "New",
                "source": "Microsoft Entra ID",
                "asset": "O365",
                "user": "klee",
                "src_ip": "198.51.100.22",
                "mitre_t": "Initial Access",
                "mitre_te": "T1078 - Valid Accounts",
            },
            {
                "client": "Riverbend Health",
                "title": "Vulnerability scanner finding on legacy server",
                "severity": "Low",
                "priority": "P4 Low",
                "status": "Pending Client",
                "source": "Tenable",
                "asset": "SRV-LEGACY-09",
                "src_ip": "10.30.1.15",
            },
            {
                "client": "Metro County IT",
                "title": "Repeated VPN authentication failure",
                "severity": "Medium",
                "priority": "P3 Medium",
                "status": "Investigating",
                "source": "Palo Alto VPN",
                "asset": "VPN-PA-01",
                "user": "contractor01",
                "src_ip": "192.0.2.100",
                "analyst": analyst2,
            },
            {
                "client": "Apex Energy",
                "title": "Privileged account login outside normal hours",
                "severity": "High",
                "priority": "P2 High",
                "status": "Escalated",
                "source": "Splunk ES",
                "asset": "AD-DC-01",
                "user": "admin_jdoe",
                "src_ip": "10.5.0.12",
                "analyst": analyst1,
            },
            {
                "client": "Riverbend Health",
                "title": "Cloud storage sharing policy violation",
                "severity": "Medium",
                "priority": "P3 Medium",
                "status": "Resolved",
                "source": "Microsoft Defender for Cloud Apps",
                "asset": "SharePoint",
                "user": "drpatel",
                "disposition": "True Positive - Benign",
                "analyst": analyst2,
            },
            {
                "client": "Metro County IT",
                "title": "Suspicious inbox forwarding rule",
                "severity": "High",
                "priority": "P2 High",
                "status": "Closed",
                "source": "Microsoft 365",
                "asset": "Exchange Online",
                "user": "clerk03",
                "disposition": "True Positive - Incident",
                "analyst": analyst1,
            },
            {
                "client": "Apex Energy",
                "title": "External RDP exposure alert",
                "severity": "Critical",
                "priority": "P1 Critical",
                "status": "Investigating",
                "source": "Shodan Monitor",
                "asset": "FW-EDGE-01",
                "src_ip": "203.0.113.99",
                "dst_ip": "10.0.0.5",
                "analyst": analyst2,
            },
            {
                "client": "Riverbend Health",
                "title": "Known malicious IP connection attempt",
                "severity": "High",
                "priority": "P2 High",
                "status": "False Positive",
                "source": "Palo Alto Firewall",
                "asset": "FW-PA-02",
                "src_ip": "185.220.101.5",
                "disposition": "False Positive",
                "analyst": analyst1,
            },
            {
                "client": "Metro County IT",
                "title": "Duplicate noisy alert - port scan",
                "severity": "Low",
                "priority": "P4 Low",
                "status": "Duplicate",
                "source": "IDS",
                "asset": "DMZ-SRV-01",
                "src_ip": "10.99.1.1",
                "disposition": "Duplicate",
                "analyst": analyst2,
            },
        ]

        sla_svc = SLAService(db)
        case_num = 0
        for spec in cases_spec:
            case_num += 1
            client = clients[spec["client"]]
            detected = NOW - timedelta(hours=case_num * 4)
            case = Case(
                case_number=f"CASE-{case_num:05d}",
                organization_id=org.id,
                client_id=client.id,
                title=spec["title"],
                description=f"Demo case: {spec['title']}",
                source_system=spec.get("source"),
                severity=spec["severity"],
                priority=spec.get("priority"),
                status=spec["status"],
                disposition=spec.get("disposition"),
                assigned_to_user_id=spec["analyst"].id if spec.get("analyst") else None,
                detected_at=detected,
                created_at=detected,
            )
            if spec["status"] not in ("New",):
                case.triaged_at = detected + timedelta(minutes=20)
            if spec.get("disposition"):
                case.dispositioned_at = detected + timedelta(hours=2)
            if spec["status"] in ("Closed", "Resolved", "False Positive", "Duplicate"):
                case.closed_at = detected + timedelta(hours=6)
            db.add(case)
            db.flush()

            alert = Alert(
                case_id=case.id,
                client_id=client.id,
                title=spec["title"],
                description=f"Alert for {spec['title']}",
                severity=spec["severity"],
                source_system=spec.get("source"),
                asset_name=spec.get("asset"),
                username=spec.get("user"),
                source_ip=spec.get("src_ip"),
                destination_ip=spec.get("dst_ip"),
                mitre_tactic=spec.get("mitre_t"),
                mitre_technique=spec.get("mitre_te"),
                raw_event='{"event":"demo"}',
                detected_at=detected,
            )
            db.add(alert)
            db.add(CaseEvent(case_id=case.id, event_type="Case Created", created_by_user_id=admin.id))

            sla_svc.create_sla_events_for_case(case)
            for i, e in enumerate(case.sla_events if hasattr(case, "sla_events") else []):
                pass
            events = db.query(SLAEvent).filter(SLAEvent.case_id == case.id).all()
            if case_num % 4 == 0:
                for e in events:
                    e.status = "Breached"
                    e.breached = True
            elif case_num % 3 == 0:
                for e in events:
                    e.status = "At Risk"

            if case_num <= 8:
                ai_rec = AIRecommendation(
                    case_id=case.id,
                    model_name="gpt-4o-mini",
                    model_provider="mock",
                    prompt_version="1.0.0",
                    summary=f"AI analysis suggests reviewing {spec['title']}. Evidence supports further investigation.",
                    key_evidence_json={"items": ["Alert metadata", "Severity classification"]},
                    recommended_disposition=spec.get("disposition") or "Needs More Information",
                    recommended_priority=spec.get("priority") or "P3 Medium",
                    confidence_score=70 + (case_num % 20),
                    rationale="Based on available alert data and context.",
                    suggested_next_steps_json={"items": ["Review logs", "Validate with asset owner"]},
                    mitre_tactics_json={"items": [spec.get("mitre_t", "N/A")]},
                    mitre_techniques_json={"items": [spec.get("mitre_te", "N/A")]},
                )
                db.add(ai_rec)
                db.flush()

                if spec.get("analyst") and case_num <= 6:
                    agreed = case_num % 2 == 0
                    db.add(
                        AnalystDecision(
                            case_id=case.id,
                            analyst_user_id=spec["analyst"].id,
                            ai_recommendation_id=ai_rec.id,
                            selected_disposition=spec.get("disposition") or "Needs More Information",
                            selected_priority=spec.get("priority") or "P3 Medium",
                            analyst_confidence=80,
                            ai_action="Accepted" if agreed else "Modified",
                            override_reason=None if agreed else "Additional context from analyst review",
                            human_ai_agreement=agreed,
                            time_to_decision_seconds=1200,
                        )
                    )

            if case_num in (2, 5, 9):
                db.add(
                    CaseNote(
                        case_id=case.id,
                        created_by_user_id=spec["analyst"].id if spec.get("analyst") else analyst1.id,
                        note_text="Internal investigation note - not for client.",
                        visibility="Internal",
                    )
                )
                db.add(
                    CaseNote(
                        case_id=case.id,
                        created_by_user_id=spec["analyst"].id if spec.get("analyst") else analyst1.id,
                        note_text="We are investigating this alert and will provide an update.",
                        visibility="Client Visible",
                    )
                )

            if case_num <= 4:
                db.add(
                    CaseEvidence(
                        case_id=case.id,
                        evidence_type="Log",
                        title="Authentication log excerpt",
                        content="user=jsmith result=failure count=5",
                        created_by_user_id=analyst1.id,
                    )
                )

            if case_num == 3:
                db.add(
                    QAReview(
                        case_id=case.id,
                        reviewer_user_id=manager.id,
                        disposition_correct=True,
                        priority_correct=True,
                        evidence_quality_score=85,
                        documentation_quality_score=80,
                        client_communication_score=75,
                        ai_usage_appropriate=True,
                        overall_score=82,
                        review_notes="Good triage workflow.",
                    )
                )

        db.commit()

        # Golden path demo case — fresh workflow for live demos
        golden = Case(
            case_number="CASE-GOLDEN",
            organization_id=org.id,
            client_id=clients["Apex Energy"].id,
            title="[DEMO] Suspicious OAuth consent grant",
            description="Golden path demo case. Use this case for live analyst workflow demos.",
            source_system="Microsoft Defender",
            severity="High",
            priority="P2 High",
            status="New",
            assigned_to_user_id=analyst1.id,
            detected_at=NOW - timedelta(minutes=30),
            created_at=NOW - timedelta(minutes=30),
        )
        db.add(golden)
        db.flush()
        db.add(
            Alert(
                case_id=golden.id,
                client_id=clients["Apex Energy"].id,
                title=golden.title,
                description="OAuth consent grant from unfamiliar application detected for privileged user.",
                severity="High",
                source_system="Microsoft Defender",
                asset_name="O365-TENANT",
                username="finance.admin",
                source_ip="198.51.100.10",
                mitre_tactic="Persistence",
                mitre_technique="T1098 - Account Manipulation",
                raw_event='{"event":"oauth_consent","app":"Unknown SaaS App"}',
                detected_at=golden.detected_at,
            )
        )
        db.add(CaseEvent(case_id=golden.id, event_type="Case Created", created_by_user_id=admin.id))
        sla_svc.create_sla_events_for_case(golden)

        add_user("viewer@apex.demo", "Apex Client Viewer", "Client Viewer", clients["Apex Energy"])

        from app.models import Report

        report = Report(
            client_id=clients["Apex Energy"].id,
            report_type="monthly",
            reporting_period_start=date(NOW.year, NOW.month, 1),
            reporting_period_end=NOW.date(),
            title=f"Apex Energy Monthly SOC Report (Pilot)",
            executive_summary="The SOC team monitored Apex Energy's environment and responded to security events within agreed SLA targets.",
            case_summary_json={"total": 4, "by_severity": {"High": 2, "Medium": 1, "Critical": 1}},
            sla_summary_json={"compliance_percentage": 92.5, "summary": "SLA performance remained strong."},
            notable_incidents_json={"items": [{"title": "Privileged account login outside hours", "severity": "High"}]},
            recurring_themes_json={"items": ["Authentication anomalies", "OAuth consent grants"]},
            recommendations_json={
                "items": ["Enable MFA for privileged accounts", "Review OAuth app permissions"],
                "human_ai_triage_summary": "AI-assisted triage supported analyst decisions with 75% acceptance rate.",
                "soc_value_narrative": "TrustOps enabled consistent case management and measurable SLA governance.",
            },
            status="Published",
            generated_by_user_id=manager.id,
            published_at=NOW,
        )
        db.add(report)
        db.commit()
        print(f"Seeded organization, {len(clients)} clients, users, and {case_num} cases.")
        print(f"Golden path case: CASE-GOLDEN (Apex Energy, assigned to analyst1)")
        print(f"Default password: {DEFAULT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
