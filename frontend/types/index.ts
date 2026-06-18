export interface User {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  email: string;
  status: string;
  roles: string[];
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  industry: string | null;
  service_tier: string | null;
  timezone: string;
  status: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  source_system: string | null;
  asset_name: string | null;
  username: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  mitre_tactic: string | null;
  mitre_technique: string | null;
  raw_event: string | null;
  detected_at: string | null;
}

export interface SLAEvent {
  id: string;
  sla_type: string;
  target_minutes: number;
  due_at: string;
  completed_at: string | null;
  status: string;
  breached: boolean;
}

export interface Case {
  id: string;
  case_number: string;
  organization_id: string;
  client_id: string;
  client_name: string | null;
  title: string;
  description: string | null;
  source_system: string | null;
  source_alert_id: string | null;
  severity: string;
  priority: string | null;
  status: string;
  disposition: string | null;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  detected_at: string | null;
  triaged_at: string | null;
  dispositioned_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  sla_status: string | null;
  ai_confidence: number | null;
  alerts: Alert[];
  sla_events: SLAEvent[];
}

export interface AIRecommendation {
  id: string;
  case_id: string;
  summary: string;
  key_evidence_json: { items?: string[] } | null;
  recommended_disposition: string | null;
  recommended_priority: string | null;
  confidence_score: number | null;
  rationale: string | null;
  suggested_next_steps_json: { items?: string[] } | null;
  mitre_tactics_json: { items?: string[] } | null;
  mitre_techniques_json: { items?: string[] } | null;
  client_notification_draft: string | null;
  closure_summary_draft: string | null;
  limitations_json: { items?: string[] } | null;
  created_at: string;
}

export interface AnalystDecision {
  id: string;
  selected_disposition: string;
  selected_priority: string;
  analyst_confidence: number;
  ai_action: string;
  override_reason: string | null;
  human_ai_agreement: boolean | null;
  created_at: string;
}

export interface CaseNote {
  id: string;
  note_text: string;
  visibility: string;
  created_by_user_id: string;
  created_at: string;
}

export interface CaseEvidence {
  id: string;
  evidence_type: string;
  title: string;
  content: string | null;
  source: string | null;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  event_type: string;
  event_description: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  client_id: string;
  report_type: string;
  reporting_period_start: string;
  reporting_period_end: string;
  title: string;
  executive_summary: string | null;
  case_summary_json: Record<string, unknown> | null;
  sla_summary_json: Record<string, unknown> | null;
  notable_incidents_json: Record<string, unknown> | null;
  recurring_themes_json: Record<string, unknown> | null;
  recommendations_json: Record<string, unknown> | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

export interface SLAPolicy {
  id: string;
  client_id: string;
  priority: string | null;
  severity: string | null;
  time_to_triage_minutes: number | null;
  time_to_disposition_minutes: number | null;
  time_to_notify_minutes: number | null;
  time_to_close_minutes: number | null;
  business_hours_only: boolean;
  active: boolean;
}
