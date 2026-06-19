'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardTitle, Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/badges';
import { KpiCard, SectionHeader, tooltipStyle } from '@/components/dashboard/kpi-card';
import { SocWorkflowFunnel } from '@/components/dashboard/soc-workflow-funnel';
import { ClientSocChat } from '@/components/dashboard/client-soc-chat';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import type { Client, ClientDashboardMetrics } from '@/types';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, CheckCircle2, FileText, FolderOpen, Shield, TrendingUp,
} from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#1d9bf0',
  Low: '#10b981',
  Informational: '#71767b',
};

function slaTone(pct: number): 'success' | 'warning' | 'danger' | 'primary' {
  if (pct >= 95) return 'success';
  if (pct >= 80) return 'warning';
  if (pct > 0) return 'danger';
  return 'primary';
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const e = new Date(end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return s === e ? s : `${s} – ${e}`;
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ClientDashboardMetrics | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);
  const [funnelLoading, setFunnelLoading] = useState(false);

  const load = useCallback(async (days: number) => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const clientId = user.client_id;
      const qs = `?days=${days}`;
      const path = clientId
        ? `/dashboards/client/${clientId}${qs}`
        : `/dashboards/executive${qs}`;
      const [data, client] = await Promise.all([
        api<ClientDashboardMetrics>(path),
        clientId ? api<Client>(`/clients/${clientId}`).catch(() => null) : Promise.resolve(null),
      ]);
      setMetrics(data);
      setClientName(client?.name ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setFunnelLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load(periodDays);
  }, [load, periodDays]);

  const handlePeriodChange = (days: number) => {
    setFunnelLoading(true);
    setPeriodDays(days);
  };

  if (loading) return <LoadingState message="Loading client dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!metrics) return null;

  const severityData = Object.entries(metrics.cases_by_severity || {})
    .map(([name, value]) => ({ name, value, fill: SEVERITY_COLORS[name] || '#71767b' }))
    .sort((a, b) => b.value - a.value);

  const dispositionData = Object.entries(metrics.cases_by_disposition || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const reports = metrics.monthly_reports || [];
  const notable = metrics.notable_incidents || [];
  const slaPct = metrics.sla_performance;
  const publishedReports = reports.filter((r) => r.status === 'Published');
  const latestReportId =
    metrics.latest_published_report_id
    || publishedReports.find((r) => r.id)?.id;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Client Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {clientName ? (
              <>Security operations overview for <span className="text-foreground">{clientName}</span></>
            ) : (
              'Your managed security service — case activity, SLA performance, and value reports.'
            )}
          </p>
          {user?.name && (
            <p className="mt-1 text-xs text-muted">Signed in as {user.name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Monthly Reports
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
      {metrics.workflow_funnel && (
        <SocWorkflowFunnel
          funnel={metrics.workflow_funnel}
          days={periodDays}
          onDaysChange={handlePeriodChange}
          loading={funnelLoading}
        />
      )}

      <Card className={cn(
        'mb-6',
        slaPct >= 95 && 'border-green-900/40 bg-green-900/10',
        slaPct >= 80 && slaPct < 95 && 'border-yellow-900/40 bg-yellow-900/10',
        slaPct > 0 && slaPct < 80 && 'border-red-900/40 bg-red-900/10',
        slaPct === 0 && 'border-primary/30 bg-primary/5',
      )}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'rounded-lg p-2',
              slaPct >= 95 ? 'bg-green-900/20 text-green-400'
                : slaPct >= 80 ? 'bg-yellow-900/20 text-yellow-300'
                  : 'bg-primary/10 text-primary',
            )}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>SLA Performance</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Percentage of SLA commitments met across your managed cases.
              </p>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <div className={cn(
              'text-5xl font-bold tabular-nums',
              slaPct >= 95 ? 'text-green-400' : slaPct >= 80 ? 'text-yellow-300' : 'text-primary',
            )}>
              {slaPct}%
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">commitments met</div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              slaPct >= 95 ? 'bg-green-500' : slaPct >= 80 ? 'bg-yellow-500' : 'bg-primary',
            )}
            style={{ width: `${Math.min(100, slaPct)}%` }}
          />
        </div>
      </Card>

      <SectionHeader
        title="Service Activity"
        description={`Case volume and charts for the last ${periodDays} days`}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open Cases"
          value={metrics.open_cases}
          sub="Active investigations"
          icon={FolderOpen}
          tone="primary"
        />
        <KpiCard
          label="Closed This Month"
          value={metrics.closed_cases_this_month}
          sub="Resolved or closed"
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="SLA Performance"
          value={`${slaPct}%`}
          sub="Commitments met"
          icon={Shield}
          tone={slaTone(slaPct)}
        />
        <KpiCard
          label="Notable Incidents"
          value={notable.length}
          sub="High/Critical with disposition"
          icon={AlertTriangle}
          tone={notable.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>Cases by Severity</CardTitle>
          <p className="mt-1 text-xs text-muted">Distribution across all cases in your tenant</p>
          {severityData.length === 0 ? (
            <EmptyState title="No cases yet" description="Case severity breakdown will appear here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#71767b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Cases" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Cases by Disposition</CardTitle>
          <p className="mt-1 text-xs text-muted">How cases were dispositioned by your SOC team</p>
          {dispositionData.length === 0 ? (
            <EmptyState title="No dispositions" description="Disposition data appears as cases are closed." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, dispositionData.length * 32)}>
              <BarChart data={dispositionData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#71767b' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={160}
                  tick={{ fill: '#71767b', fontSize: 10 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Cases" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <CardTitle>Notable Incidents</CardTitle>
              <p className="mt-1 text-xs text-muted">High and Critical cases with analyst disposition</p>
            </div>
            {notable.length > 0 && (
              <Badge variant="warning">{notable.length}</Badge>
            )}
          </div>
          {notable.length === 0 ? (
            <EmptyState title="No notable incidents" description="High-severity dispositioned cases appear here." />
          ) : (
            <ul className="space-y-2">
              {notable.map((n, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/30"
                >
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={n.severity} />
                    <span className="text-xs text-muted">{n.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <CardTitle>Monthly Reports</CardTitle>
              <p className="mt-1 text-xs text-muted">Published value reports from your MDR provider</p>
            </div>
            {publishedReports.length > 0 && (
              <Badge variant="success">{publishedReports.length} published</Badge>
            )}
          </div>
          {reports.length === 0 ? (
            <EmptyState title="No reports yet" description="Your SOC provider will publish monthly value reports here." />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/app/reports/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-primary">{r.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {formatPeriod(r.period_start, r.period_end)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={r.status === 'Published' ? 'success' : 'default'}>{r.status}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {reports.length > 0 && (
            <Link href="/app/reports" className="mt-4 inline-flex items-center text-sm text-primary hover:underline">
              View all reports <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          )}
        </Card>
      </div>

      <Card className="mt-4 border-primary/20 bg-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <CardTitle>Value Delivered</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Read your latest monthly report for executive summary, SLA performance, and service highlights.
              </p>
            </div>
          </div>
          {latestReportId ? (
            <Link href={`/app/reports/${latestReportId}`}>
              <Button size="sm">Read Latest Report</Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" disabled>No published report</Button>
          )}
        </div>
      </Card>
        </div>

        {user?.client_id && (
          <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[min(100%,22rem)] xl:self-start 2xl:w-96">
            <ClientSocChat
              clientId={user.client_id}
              periodDays={periodDays}
              clientName={clientName}
              layout="sidebar"
            />
          </aside>
        )}
      </div>
    </div>
  );
}
