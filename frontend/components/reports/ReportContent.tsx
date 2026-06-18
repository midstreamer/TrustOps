'use client';

import type { Report } from '@/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 border-b border-border pb-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type CaseSummary = {
  total?: number;
  by_severity?: Record<string, number>;
  by_disposition?: Record<string, number>;
  service_activity?: string;
  overview?: string;
};

type RecsJson = {
  items?: string[];
  recommended_actions?: string[];
  next_month_focus?: string[];
  next_month_priorities?: string[];
  human_ai_triage_summary?: string;
  ai_triage_oversight?: string;
  trust_metrics_summary?: {
    trust_calibration_score?: number;
    human_ai_agreement_rate?: number;
    ai_acceptance_rate?: number;
    override_count?: number;
    definition?: string;
  };
  value_delivered?: string;
  soc_value_narrative?: string;
};

export function ReportContent({
  report,
  variant = 'screen',
}: {
  report: Report;
  variant?: 'screen' | 'print';
}) {
  const caseSummary = (report.case_summary_json || {}) as CaseSummary;
  const slaSummary = report.sla_summary_json || {};
  const notable = report.notable_incidents_json || {};
  const themes = report.recurring_themes_json || {};
  const recs = (report.recommendations_json || {}) as RecsJson;
  const notableItems = (notable as { items?: Array<{ title: string; severity?: string }>; notable_cases?: Array<{ title: string; severity?: string }> }).notable_cases
    || (notable as { items?: Array<{ title: string; severity?: string }> }).items
    || [];
  const actions = recs.recommended_actions || recs.items || [];
  const nextFocus = recs.next_month_focus || recs.next_month_priorities || [];
  const trust = recs.trust_metrics_summary;
  const textClass = variant === 'print' ? 'text-gray-700' : 'text-sm leading-relaxed';

  return (
    <>
      <Section title="Executive Summary">
        <p className={textClass}>{report.executive_summary || 'No summary available.'}</p>
      </Section>

      <Section title="Service Activity">
        <p className={textClass}>{caseSummary.service_activity || caseSummary.overview || `Total cases: ${caseSummary.total ?? 'N/A'}`}</p>
        {caseSummary.by_severity && (
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-medium text-muted">By Severity</h3>
            <ul className="text-sm">{Object.entries(caseSummary.by_severity).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
          </div>
        )}
        {caseSummary.by_disposition && (
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-medium text-muted">By Disposition</h3>
            <ul className="text-sm">{Object.entries(caseSummary.by_disposition).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
          </div>
        )}
      </Section>

      <Section title="Notable Cases">
        <p className={`mb-2 ${variant === 'print' ? 'text-gray-600' : 'text-sm text-muted'}`}>{(notable as { summary?: string }).summary}</p>
        <ul className={`list-inside list-disc ${textClass}`}>
          {notableItems.map((item, i) => (
            <li key={i}>{item.title}{item.severity ? ` (${item.severity})` : ''}</li>
          ))}
        </ul>
      </Section>

      <Section title="SLA Performance">
        <p className={textClass}>{(slaSummary as { summary?: string }).summary || 'SLA data for the reporting period.'}</p>
        {(slaSummary as { compliance_percentage?: number }).compliance_percentage != null && (
          <p className="mt-2 text-lg font-bold">{(slaSummary as { compliance_percentage: number }).compliance_percentage}% compliance</p>
        )}
      </Section>

      <Section title="AI-Assisted Triage Oversight">
        <p className={textClass}>{recs.ai_triage_oversight || recs.human_ai_triage_summary || 'AI-assisted triage supported analyst decision-making during this period.'}</p>
      </Section>

      {trust && (
        <Section title="Trust Metrics Summary">
          <div className={`grid grid-cols-2 gap-3 ${textClass}`}>
            {trust.trust_calibration_score != null && (
              <div><span className="text-muted">Trust Calibration</span><div className="font-bold">{trust.trust_calibration_score}</div></div>
            )}
            {trust.human_ai_agreement_rate != null && (
              <div><span className="text-muted">Human-AI Agreement</span><div className="font-bold">{trust.human_ai_agreement_rate}%</div></div>
            )}
            {trust.ai_acceptance_rate != null && (
              <div><span className="text-muted">AI Acceptance</span><div className="font-bold">{trust.ai_acceptance_rate}%</div></div>
            )}
            {trust.override_count != null && (
              <div><span className="text-muted">Overrides</span><div className="font-bold">{trust.override_count}</div></div>
            )}
          </div>
        </Section>
      )}

      <Section title="Recurring Risk Themes">
        <ul className={`list-inside list-disc ${textClass}`}>
          {((themes as { items?: string[] }).items || []).map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </Section>

      <Section title="Recommended Actions">
        <ul className={`list-inside list-disc ${textClass}`}>
          {actions.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </Section>

      <Section title="Value Delivered">
        <p className={textClass}>{recs.value_delivered || recs.soc_value_narrative || caseSummary.overview || 'The SOC team provided continuous monitoring and case management services.'}</p>
      </Section>

      <Section title="Next Month Focus">
        <ul className={`list-inside list-disc ${textClass}`}>
          {nextFocus.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </Section>
    </>
  );
}
