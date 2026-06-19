'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Report, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, Badge } from '@/components/ui/card';
import { SectionHeader } from '@/components/dashboard/kpi-card';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { ArrowRight, FileText, Plus } from 'lucide-react';

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const s = new Date(start).toLocaleDateString(undefined, opts);
  const e = new Date(end).toLocaleDateString(undefined, opts);
  return `${s} – ${e}`;
}

function statusVariant(status: string) {
  if (status === 'Published') return 'success';
  if (status === 'Draft') return 'warning';
  return 'default';
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();
  const isManager = hasRole(user, MANAGER_ROLES);

  useEffect(() => {
    Promise.all([
      api<Report[]>('/reports'),
      isManager ? api<Client[]>('/clients').catch(() => []) : Promise.resolve([]),
    ])
      .then(([r, c]) => {
        setReports(r);
        setClients(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, [isManager]);

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.name])),
    [clients],
  );

  const filtered = useMemo(() => {
    if (!statusFilter) return reports;
    return reports.filter((r) => r.status === statusFilter);
  }, [reports, statusFilter]);

  const publishedCount = reports.filter((r) => r.status === 'Published').length;
  const draftCount = reports.filter((r) => r.status === 'Draft').length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monthly Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Client value reports — executive summaries, SLA performance, and service highlights.
          </p>
        </div>
        {isManager && (
          <Link href="/app/reports/new">
            <Button><Plus className="mr-2 h-4 w-4" /> New Report</Button>
          </Link>
        )}
      </div>

      {isManager && reports.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card className="border-primary/30 bg-primary/5">
            <div className="text-xs uppercase tracking-wide text-muted">Total Reports</div>
            <div className="mt-1 text-2xl font-bold">{reports.length}</div>
          </Card>
          <Card className="border-green-900/30 bg-green-900/10">
            <div className="text-xs uppercase tracking-wide text-muted">Published</div>
            <div className="mt-1 text-2xl font-bold text-green-400">{publishedCount}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">Drafts</div>
            <div className="mt-1 text-2xl font-bold">{draftCount}</div>
          </Card>
        </div>
      )}

      {isManager && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Filter by status</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[160px]">
                <option value="">All reports</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <SectionHeader
        title="Reports"
        description={isManager ? 'Generate, review, and publish client value reports' : 'Published reports from your SOC provider'}
      />

      {loading ? (
        <LoadingState message="Loading reports..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No reports found"
          description={isManager ? 'Generate a monthly report for a managed client.' : 'Published reports will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => router.push(`/app/reports/${r.id}`)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-lg font-semibold">{r.title}</span>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span>{formatPeriod(r.reporting_period_start, r.reporting_period_end)}</span>
                    {clientMap[r.client_id] && (
                      <span>{clientMap[r.client_id]}</span>
                    )}
                    <span className="capitalize">{r.report_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {r.published_at && (
                    <span className="text-xs text-green-400">
                      Published {new Date(r.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
