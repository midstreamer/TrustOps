'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Client, Report } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ReportContent } from '@/components/reports/ReportContent';
import { cn } from '@/lib/utils';
import { Archive, ArrowLeft, Calendar, Eye, Send } from 'lucide-react';

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

function statusVariant(status: string) {
  if (status === 'Published') return 'success';
  if (status === 'Draft') return 'warning';
  return 'default';
}

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const isManager = hasRole(user, MANAGER_ROLES);

  useEffect(() => {
    api<Report>(`/reports/${reportId}`)
      .then(async (r) => {
        setReport(r);
        if (isManager) {
          const client = await api<Client>(`/clients/${r.client_id}`).catch(() => null);
          setClientName(client?.name ?? null);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [reportId, isManager]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await api(`/reports/${reportId}/regenerate`, { method: 'POST' });
      const updated = await api<Report>(`/reports/${reportId}`);
      setReport(updated);
    } finally {
      setRegenerating(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await api(`/reports/${reportId}/publish`, { method: 'POST' });
      const updated = await api<Report>(`/reports/${reportId}`);
      setReport(updated);
    } finally {
      setPublishing(false);
    }
  };

  const archive = async () => {
    await api(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status: 'Archived' }) });
    router.push('/app/reports');
  };

  if (loading) return <LoadingState message="Loading report..." />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/app/reports" className="mb-4 inline-flex items-center text-sm text-muted hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Reports
      </Link>

      <Card className={cn(
        'mb-6',
        report.status === 'Published' && 'border-green-900/40 bg-green-900/10',
        report.status === 'Draft' && 'border-yellow-900/40 bg-yellow-900/10',
      )}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
              {report.published_at && (
                <span className="text-xs text-muted">
                  Published {new Date(report.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold">{report.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatPeriod(report.reporting_period_start, report.reporting_period_end)}
              </span>
              {clientName && <span>{clientName}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/app/reports/${reportId}/preview`}>
              <Button variant="secondary" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Preview / PDF
              </Button>
            </Link>
            {isManager && (
              <Button size="sm" variant="secondary" onClick={regenerate} disabled={regenerating}>
                {regenerating ? 'Regenerating…' : 'Regenerate with AI'}
              </Button>
            )}
            {isManager && report.status === 'Draft' && (
              <Button size="sm" onClick={publish} disabled={publishing}>
                <Send className="mr-2 h-4 w-4" />
                {publishing ? 'Publishing…' : 'Publish'}
              </Button>
            )}
            {isManager && report.status !== 'Archived' && (
              <Button size="sm" variant="secondary" onClick={archive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ReportContent report={report} variant="screen" />
    </div>
  );
}
