'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Report } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ReportContent } from '@/components/reports/ReportContent';
import { Eye } from 'lucide-react';

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
            <Button variant="secondary"><Eye className="mr-2 h-4 w-4" /> Preview / PDF</Button>
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

      <Card className="space-y-2">
        <ReportContent report={report} variant="screen" />
      </Card>
    </div>
  );
}
