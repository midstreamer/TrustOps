'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Report } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Eye } from 'lucide-react';

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 border-b border-border pb-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const router = useRouter();
  const isManager = hasRole(user, MANAGER_ROLES);

  useEffect(() => {
    api<Report>(`/reports/${reportId}`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [reportId]);

  const publish = async () => {
    await api(`/reports/${reportId}/publish`, { method: 'POST' });
    const updated = await api<Report>(`/reports/${reportId}`);
    setReport(updated);
  };

  if (loading) return <LoadingState message="Loading report..." />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  const caseSummary = report.case_summary_json || {};
  const slaSummary = report.sla_summary_json || {};
  const notable = report.notable_incidents_json || {};
  const themes = report.recurring_themes_json || {};
  const recs = report.recommendations_json || {};

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <p className="text-sm text-muted">
            {report.reporting_period_start} to {report.reporting_period_end} · {report.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/reports/${reportId}/preview`}>
            <Button variant="secondary"><Eye className="mr-2 h-4 w-4" /> Preview</Button>
          </Link>
          {isManager && report.status === 'Draft' && <Button onClick={publish}>Publish</Button>}
          {isManager && report.status !== 'Archived' && (
            <Button variant="secondary" onClick={async () => {
              await api(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status: 'Archived' }) });
              router.push('/app/reports');
            }}>Archive</Button>
          )}
        </div>
      </div>

      <Card className="space-y-6">
        <ReportSection title="Executive Summary">
          <p className="text-sm leading-relaxed">{report.executive_summary || 'No summary available.'}</p>
        </ReportSection>

        <ReportSection title="SOC Activity Overview">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div><span className="text-muted">Total Cases</span><div className="text-xl font-bold">{(caseSummary as { total?: number }).total ?? '—'}</div></div>
          </div>
          {(caseSummary as { by_severity?: Record<string, number> }).by_severity && (
            <div className="mt-3">
              <h3 className="mb-1 text-sm font-medium text-muted">By Severity</h3>
              <ul className="text-sm">{Object.entries((caseSummary as { by_severity: Record<string, number> }).by_severity).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
            </div>
          )}
          {(caseSummary as { by_disposition?: Record<string, number> }).by_disposition && (
            <div className="mt-3">
              <h3 className="mb-1 text-sm font-medium text-muted">By Disposition</h3>
              <ul className="text-sm">{Object.entries((caseSummary as { by_disposition: Record<string, number> }).by_disposition).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
            </div>
          )}
        </ReportSection>

        <ReportSection title="SLA Performance">
          <p className="text-sm">{(slaSummary as { summary?: string }).summary || 'SLA data for the reporting period.'}</p>
          {(slaSummary as { compliance_percentage?: number }).compliance_percentage != null && (
            <p className="mt-2 text-lg font-bold">{(slaSummary as { compliance_percentage: number }).compliance_percentage}% compliance</p>
          )}
        </ReportSection>

        <ReportSection title="Notable Incidents">
          <p className="mb-2 text-sm text-muted">{(notable as { summary?: string }).summary}</p>
          <ul className="list-inside list-disc text-sm">
            {((notable as { items?: Array<{ title: string; severity: string }> }).items || []).map((item, i) => (
              <li key={i}>{item.title} ({item.severity})</li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="Recurring Themes">
          <ul className="list-inside list-disc text-sm">
            {((themes as { items?: string[] }).items || []).map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </ReportSection>

        <ReportSection title="Recommendations">
          <ul className="mb-4 list-inside list-disc text-sm">
            {((recs as { items?: string[] }).items || []).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </ReportSection>

        <ReportSection title="Human-AI Triage Summary">
          <p className="text-sm">{(recs as { human_ai_triage_summary?: string }).human_ai_triage_summary || 'AI-assisted triage supported analyst decision-making during this period.'}</p>
        </ReportSection>

        <ReportSection title="SOC Value Delivered">
          <p className="text-sm">{(recs as { soc_value_narrative?: string }).soc_value_narrative || (caseSummary as { overview?: string }).overview || 'The SOC team provided continuous monitoring and case management services.'}</p>
        </ReportSection>
      </Card>
    </div>
  );
}
