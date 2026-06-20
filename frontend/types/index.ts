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
  external_ticket_system: string | null;
  external_ticket_id: string | null;
  external_ticket_url: string | null;
  external_ticket_synced_at: string | null;
  alerts: Alert[];
  sla_events: SLAEvent[];
  quality?: CaseQuality | null;
}

export interface CaseQuality {
  case_id?: string;
  case_number?: string;
  quality_score: number;
  quality_grade: string;
  flags: string[];
  score_breakdown: Record<string, number>;
}

export interface IntegrationStatus {
  integration_key: string;
  integration_name: string;
  source_system: string;
  status: string;
  last_alert_received_at: string | null;
  alerts_received_last_24h: number;
  failed_payloads_last_24h: number;
  last_error: string | null;
  api_key_configured: boolean;
  client_mapping_status: string;
}

export interface AuditLogItem {
  id: string;
  event_type: string;
  event_type_label: string;
  entity_type: string | null;
  entity_id: string | null;
  client_id: string | null;
  client_name: string | null;
  case_id: string | null;
  case_number: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
  previous_value_json: Record<string, unknown> | null;
  new_value_json: Record<string, unknown> | null;
}

export interface AuditLogList {
  items: AuditLogItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrustMetricsDrilldownItem {
  case_id: string;
  case_number: string;
  client_name: string | null;
  title: string;
  severity: string;
  priority: string | null;
  ai_confidence: number | null;
  analyst_confidence: number;
  ai_action: string;
  human_ai_agreement: boolean | null;
  qa_score: number | null;
  created_at: string;
}

export interface TrustMetricsDrilldown {
  type: string;
  items: TrustMetricsDrilldownItem[];
  total: number;
  limit: number;
  offset: number;
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
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  file_hash: string | null;
  visibility: string;
  uploaded_at: string | null;
  has_file?: boolean;
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

export interface SocManagerMetrics {
  total_open_cases: number;
  cases_by_priority: Record<string, number>;
  cases_by_status: Record<string, number>;
  sla_at_risk: number;
  sla_breached: number;
  avg_time_to_triage_minutes: number;
  avg_time_to_disposition_minutes: number;
  ai_acceptance_rate: number;
  ai_override_rate: number;
  qa_average_score: number;
  analyst_workload: Record<string, number>;
  low_quality_cases?: number;
  needs_qa_cases?: number;
}

export interface TrustMetricsWeeklyTrend {
  week_start: string;
  week_label: string;
  decision_count: number;
  acceptance_rate: number;
  trust_calibration_score: number;
}

export interface TrustMetrics {
  ai_recommendation_count: number;
  ai_acceptance_rate: number;
  ai_modification_rate: number;
  ai_rejection_rate: number;
  ai_not_used_rate: number;
  ai_escalated_rate: number;
  human_ai_agreement_rate: number;
  average_ai_confidence: number;
  average_analyst_confidence: number;
  override_count: number;
  overrides_by_analyst: Record<string, number>;
  overrides_by_disposition: Record<string, number>;
  ai_action_breakdown: Record<string, number>;
  trust_calibration_score: number;
  trust_calibration_definition: string;
  trust_calibration_components: {
    agreement_component: number;
    high_confidence_alignment: number;
    qa_validation_component: number;
  };
  ai_high_confidence_accepted: number;
  ai_high_confidence_rejected: number;
  ai_low_confidence_accepted: number;
  analyst_low_confidence_escalations: number;
  human_ai_disagreement_rate_by_severity: Record<string, number>;
  override_reasons_by_category: Record<string, number>;
  decision_reversal_rate_after_qa: number;
  qa_confirmed_override_accuracy: number;
  qa_review_count: number;
  decision_count?: number;
  filters?: {
    client_id: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  weekly_trends?: TrustMetricsWeeklyTrend[];
}

export interface AdminOverview {
  organization_id: string;
  organization_name: string;
  deployment_mode: string;
  client_count: number;
  user_count: number;
  sla_policy_count: number;
  case_count: number;
  clients_without_sla: Array<{ id: string; name: string }>;
  clients_without_portal_users: Array<{ id: string; name: string }>;
  checklist: {
    has_clients: boolean;
    all_clients_have_sla: boolean;
    has_soc_users: boolean;
    all_clients_have_portal_users: boolean;
    has_cases: boolean;
    setup_complete: boolean;
  };
}

export interface AdminSummary extends AdminOverview {
  app_version: string;
  integration_key_count: number;
}

export interface PilotChecklistItem {
  key: string;
  label: string;
  status: 'Complete' | 'Needs attention' | 'Not started';
  complete: boolean;
}

export interface PilotChecklist {
  items: PilotChecklistItem[];
  complete_count: number;
  total_count: number;
  ready_for_pilot: boolean;
}

export interface IntegrationKey {
  id: string;
  client_id: string;
  integration_name: string;
  source_system: string;
  key_prefix: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export interface IntegrationKeyCreated extends IntegrationKey {
  raw_key: string;
}

export interface ReportBranding {
  id?: string;
  organization_id?: string;
  client_id?: string | null;
  provider_name: string | null;
  provider_logo_url: string | null;
  client_logo_url: string | null;
  report_title: string;
  prepared_by: string | null;
  prepared_for: string | null;
  confidentiality_footer: string | null;
  cover_page_enabled: boolean;
  theme_name: string | null;
}

export interface ExternalTicketSummary {
  target: string;
  short_description: string;
  description: string;
  priority: string;
  category?: string | null;
  subcategory?: string | null;
  assignment_group?: string | null;
  issue_type?: string | null;
  project_key?: string | null;
  labels?: string[] | null;
  external_reference: string;
}

export interface WorkflowFunnelStage {
  id: string;
  label: string;
  total: number;
  prior_total?: number;
  trend_pct?: number;
  color: string;
  breakdown: Array<{ label: string; count: number }>;
}

export interface WorkflowFunnel {
  period_start: string;
  period_end: string;
  stages: WorkflowFunnelStage[];
}

export interface ClientDashboardMetrics {
  open_cases: number;
  closed_cases_this_month: number;
  sla_performance: number;
  notable_incidents: Array<{ title: string; severity: string; status: string }>;
  cases_by_severity: Record<string, number>;
  cases_by_disposition: Record<string, number>;
  monthly_reports: Array<{
    id: string;
    title: string;
    status: string;
    period_start: string;
    period_end: string;
  }>;
  latest_published_report_id?: string | null;
  workflow_funnel?: WorkflowFunnel;
  period_days?: number;
}

export interface IntegrationEvent {
  id: string;
  organization_id: string;
  client_id: string | null;
  integration_source: string;
  event_type: string;
  status: string;
  source_system: string | null;
  source_alert_id: string | null;
  case_id: string | null;
  case_number: string | null;
  error_message: string | null;
  payload_summary: string | null;
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
