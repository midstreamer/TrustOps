'use client';

import type { Report } from '@/types';
import { Badge, Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/badges';
import { cn } from '@/lib/utils';
import {
  Activity, AlertTriangle, Brain, CheckCircle2, FileText, Lightbulb, Scale, Shield, Target, TrendingUp,
} from 'lucide-react';

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Executive Summary': FileText,
  'Service Activity': Activity,
  'Notable Cases': AlertTriangle,
  'SLA Performance': Shield,
  'AI-Assisted Triage Oversight': Brain,
  'Trust Metrics Summary': Scale,
  'Recurring Risk Themes': TrendingUp,
  'Recommended Actions': Lightbulb,
  'Value Delivered': CheckCircle2,
  'Next Month Focus': Target,
};

function Section({
  title,
  children,
  variant = 'screen',
}: {
  title: string;
  children: React.ReactNode;
  variant?: 'screen' | 'print';
}) {
  const Icon = SECTION_ICONS[title] || FileText;
  if (variant === 'print') {
    return (
      <section className="mb-6 break-inside-avoid">
        <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-semibold text-gray-900">{title}</h2>
        {children}
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-background/40 p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
        <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatPills({ data, variant }: { data: Record<string, number>; variant: 'screen' | 'print' }) {
  if (variant === 'print') {
    return (
      <ul className="text-sm text-gray-700">
        {Object.entries(data).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
      </ul>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          <SeverityBadge severity={k} />
          <span className="font-semibold tabular-nums">{v}</span>
        </div>
      ))}
    </div>
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
  const textClass = variant === 'print' ? 'text-gray-700 leading-relaxed' : 'text-sm leading-relaxed text-foreground/90';
  const listClass = cn(
    'list-disc space-y-2 pl-5',
    variant === 'print' ? 'text-gray-700' : 'text-sm',
  );

  const compliance = (slaSummary as { compliance_percentage?: number }).compliance_percentage;

  return (
    <div className={variant === 'screen' ? 'space-y-4' : undefined}>
      <Section title="Executive Summary" variant={variant}>
        <p className={textClass}>{report.executive_summary || 'No summary available.'}</p>
      </Section>

      <Section title="Service Activity" variant={variant}>
        <p className={textClass}>
          {caseSummary.service_activity || caseSummary.overview || `Total cases: ${caseSummary.total ?? 'N/A'}`}
        </p>
        {caseSummary.by_severity && Object.keys(caseSummary.by_severity).length > 0 && (
          <div className="mt-4">
            <h3 className={cn('mb-2 text-xs font-medium uppercase tracking-wide', variant === 'print' ? 'text-gray-500' : 'text-muted')}>
              By Severity
            </h3>
            <StatPills data={caseSummary.by_severity} variant={variant} />
          </div>
        )}
        {caseSummary.by_disposition && Object.keys(caseSummary.by_disposition).length > 0 && (
          <div className="mt-4">
            <h3 className={cn('mb-2 text-xs font-medium uppercase tracking-wide', variant === 'print' ? 'text-gray-500' : 'text-muted')}>
              By Disposition
            </h3>
            {variant === 'print' ? (
              <ul className="text-sm text-gray-700">
                {Object.entries(caseSummary.by_disposition).map(([k, v]) => <li key={k}>{k}: {v}</li>)}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(caseSummary.by_disposition).map(([k, v]) => (
                  <Badge key={k} variant="default">{k}: {v}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Notable Cases" variant={variant}>
        {(notable as { summary?: string }).summary && (
          <p className={cn('mb-3', variant === 'print' ? 'text-gray-600' : 'text-sm text-muted')}>
            {(notable as { summary?: string }).summary}
          </p>
        )}
        {notableItems.length === 0 ? (
          <p className={variant === 'print' ? 'text-gray-500' : 'text-sm text-muted'}>No notable cases this period.</p>
        ) : variant === 'print' ? (
          <ul className={listClass}>
            {notableItems.map((item, i) => (
              <li key={i} className="pl-1">{item.title}{item.severity ? ` (${item.severity})` : ''}</li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {notableItems.map((item, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                <div className="font-medium">{item.title}</div>
                {item.severity && (
                  <div className="mt-2"><SeverityBadge severity={item.severity} /></div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="SLA Performance" variant={variant}>
        <p className={textClass}>
          {(slaSummary as { summary?: string }).summary || 'SLA data for the reporting period.'}
        </p>
        {compliance != null && (
          variant === 'print' ? (
            <p className="mt-2 text-lg font-bold text-gray-900">{compliance}% compliance</p>
          ) : (
            <Card className={cn(
              'mt-4 max-w-xs border-primary/30 bg-primary/5',
              compliance >= 95 && 'border-green-900/40 bg-green-900/10',
            )}>
              <div className="text-xs uppercase tracking-wide text-muted">SLA Compliance</div>
              <div className={cn(
                'mt-1 text-3xl font-bold tabular-nums',
                compliance >= 95 ? 'text-green-400' : 'text-primary',
              )}>
                {compliance}%
              </div>
            </Card>
          )
        )}
      </Section>

      <Section title="AI-Assisted Triage Oversight" variant={variant}>
        <p className={textClass}>
          {recs.ai_triage_oversight || recs.human_ai_triage_summary || 'AI-assisted triage supported analyst decision-making during this period.'}
        </p>
      </Section>

      {trust && (
        <Section title="Trust Metrics Summary" variant={variant}>
          {variant === 'print' ? (
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              {trust.trust_calibration_score != null && (
                <div><span className="text-gray-500">Trust Calibration</span><div className="font-bold">{trust.trust_calibration_score}</div></div>
              )}
              {trust.human_ai_agreement_rate != null && (
                <div><span className="text-gray-500">Human-AI Agreement</span><div className="font-bold">{trust.human_ai_agreement_rate}%</div></div>
              )}
              {trust.ai_acceptance_rate != null && (
                <div><span className="text-gray-500">AI Acceptance</span><div className="font-bold">{trust.ai_acceptance_rate}%</div></div>
              )}
              {trust.override_count != null && (
                <div><span className="text-gray-500">Overrides</span><div className="font-bold">{trust.override_count}</div></div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trust.trust_calibration_score != null && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="text-xs text-muted">Calibration</div>
                  <div className="mt-1 text-2xl font-bold text-primary">{trust.trust_calibration_score}</div>
                </div>
              )}
              {trust.human_ai_agreement_rate != null && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted">Agreement</div>
                  <div className="mt-1 text-2xl font-bold">{trust.human_ai_agreement_rate}%</div>
                </div>
              )}
              {trust.ai_acceptance_rate != null && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted">AI Accepted</div>
                  <div className="mt-1 text-2xl font-bold">{trust.ai_acceptance_rate}%</div>
                </div>
              )}
              {trust.override_count != null && (
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted">Overrides</div>
                  <div className="mt-1 text-2xl font-bold">{trust.override_count}</div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      <Section title="Recurring Risk Themes" variant={variant}>
        {((themes as { items?: string[] }).items || []).length === 0 ? (
          <p className={variant === 'print' ? 'text-gray-500' : 'text-sm text-muted'}>No recurring themes identified.</p>
        ) : (
          <ul className={listClass}>
            {((themes as { items?: string[] }).items || []).map((t, i) => (
              <li key={i} className="pl-1">{t}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recommended Actions" variant={variant}>
        {actions.length === 0 ? (
          <p className={variant === 'print' ? 'text-gray-500' : 'text-sm text-muted'}>No recommendations this period.</p>
        ) : (
          <ul className={listClass}>
            {actions.map((r, i) => <li key={i} className="pl-1">{r}</li>)}
          </ul>
        )}
      </Section>

      <Section title="Value Delivered" variant={variant}>
        <p className={textClass}>
          {recs.value_delivered || recs.soc_value_narrative || caseSummary.overview || 'The SOC team provided continuous monitoring and case management services.'}
        </p>
      </Section>

      <Section title="Next Month Focus" variant={variant}>
        {nextFocus.length === 0 ? (
          <p className={variant === 'print' ? 'text-gray-500' : 'text-sm text-muted'}>No focus areas defined.</p>
        ) : (
          <ul className={listClass}>
            {nextFocus.map((r, i) => <li key={i} className="pl-1">{r}</li>)}
          </ul>
        )}
      </Section>
    </div>
  );
}
