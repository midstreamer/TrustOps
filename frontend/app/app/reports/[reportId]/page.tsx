'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Report } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const isManager = hasRole(user, MANAGER_ROLES);

  useEffect(() => {
    api<Report>(`/reports/${reportId}`).then(setReport).catch(console.error);
  }, [reportId]);

  const publish = async () => {
    await api(`/reports/${reportId}/publish`, { method: 'POST' });
    api<Report>(`/reports/${reportId}`).then(setReport);
  };

  const archive = async () => {
    await api(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status: 'Archived' }) });
    router.push('/app/reports');
  };

  if (!report) return <div className="text-muted">Loading report...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <div className="flex gap-2">
          {isManager && report.status === 'Draft' && <Button onClick={publish}>Publish</Button>}
          {isManager && report.status !== 'Archived' && <Button variant="secondary" onClick={archive}>Archive</Button>}
        </div>
      </div>
      <div className="text-sm text-muted">Status: {report.status} · {report.reporting_period_start} to {report.reporting_period_end}</div>

      <Card>
        <CardTitle>Executive Summary</CardTitle>
        <p className="mt-2 text-sm">{report.executive_summary || 'No summary'}</p>
      </Card>

      {report.case_summary_json && (
        <Card>
          <CardTitle>Case Summary</CardTitle>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report.case_summary_json, null, 2)}</pre>
        </Card>
      )}

      {report.sla_summary_json && (
        <Card>
          <CardTitle>SLA Summary</CardTitle>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report.sla_summary_json, null, 2)}</pre>
        </Card>
      )}

      {report.notable_incidents_json && (
        <Card>
          <CardTitle>Notable Incidents</CardTitle>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report.notable_incidents_json, null, 2)}</pre>
        </Card>
      )}

      {report.recurring_themes_json && (
        <Card>
          <CardTitle>Recurring Themes</CardTitle>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report.recurring_themes_json, null, 2)}</pre>
        </Card>
      )}

      {report.recommendations_json && (
        <Card>
          <CardTitle>Recommendations</CardTitle>
          <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(report.recommendations_json, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
