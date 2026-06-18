"""Application constants and allowed enum values."""

CASE_STATUSES = [
    "New",
    "Triaged",
    "Investigating",
    "Pending Client",
    "Escalated",
    "Contained",
    "Resolved",
    "Closed",
    "False Positive",
    "Duplicate",
]

DISPOSITIONS = [
    "True Positive - Benign",
    "True Positive - Suspicious",
    "True Positive - Incident",
    "False Positive",
    "Duplicate",
    "Authorized Activity",
    "Needs More Information",
]

PRIORITIES = ["P1 Critical", "P2 High", "P3 Medium", "P4 Low"]

SEVERITIES = ["Critical", "High", "Medium", "Low", "Informational"]

NOTE_VISIBILITY = ["Internal", "Client Visible"]

EVIDENCE_TYPES = ["Log", "Screenshot", "File", "URL", "Analyst Note", "Tool Output", "Other"]

AI_ACTIONS = ["Accepted", "Modified", "Rejected", "Escalated", "Not Used"]

SLA_TYPES = ["Triage", "Disposition", "Notification", "Closure"]

SLA_STATUSES = [
    "Not Started",
    "In Progress",
    "At Risk",
    "Breached",
    "Met",
    "Exception Granted",
]

REPORT_STATUSES = ["Draft", "Published", "Archived"]

ROLES = [
    "Platform Admin",
    "SOC Manager",
    "SOC Analyst",
    "Client Admin",
    "Client Viewer",
]

DEFAULT_PASSWORD = "TrustOps123!"
