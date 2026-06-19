'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SeverityBadge, SlaBadge } from '@/components/ui/badges';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { KpiCard, SectionHeader, tooltipStyle } from '@/components/dashboard/kpi-card';
import type { Case, SocManagerMetrics } from '@/types';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, BarChart3, Brain, ClipboardCheck, Clock,
  FileText, FolderOpen, Shield, Users,
} from 'lucide-react';

const STATUS_COLORS = ['#1d9bf0', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#71767b'];

const PRIORITY_COLORS: Record<string, string> = {
  'P1 Critical': '#ef4444',
  'P2 High': '#f59e0b',
  'P3 Medium': '#1d9bf0',
  'P4 Low': '#10b981',
  Unset: '#71767b',
};

export default function ManagerDashboard() {
  const [metrics, setMetrics] = useState<SocManagerMetrics | null>(null);
  const [atRiskCases, setAtRiskCases] = useState<Case[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dash, cases] = await Promise.all([
        api<SocManagerMetrics>('/dashboards/soc-manager'),
        api<Case[]>('/cases?sla_at_risk=true'),
      ]);
      setMetrics(dash);
      setAtRiskCases(cases.slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading manager dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!metrics) return null;

  const priorityData = Object.entries(metrics.cases_by_priority || {})
    .map(([name, value]) => ({ name, value, fill: PRIORITY_COLORS[name] || PRIORITY_COLORS.Unset }))
    .sort((a, b) => b.value - a.value);

  const statusData = Object.entries(metrics.cases_by_status || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const workloadData = Object.entries(metrics.analyst_workload || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const hasSlaIssues = metrics.sla_at_risk > 0 || metrics.sla_breached > 0;
  const openCases = metrics.total_open_cases;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SOC Manager Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Operational command center for queue health, SLA governance, analyst workload, and AI decision quality.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/cases?sla_at_risk=true">
            <Button variant="secondary" size="sm">
              <AlertTriangle className="mr-2 h-4 w-4" />
              SLA At Risk
            </Button>
          </Link>
          <Link href="/app/trust-metrics">
            <Button variant="secondary" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trust Metrics
            </Button>
          </Link>
          <Link href="/app/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {hasSlaIssues && (
        <Card className="mb-6 border-yellow-900/50 bg-yellow-900/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
              <div>
                <div className="font-medium text-yellow-100">SLA attention required</div>
                <p className="mt-1 text-sm text-yellow-200/80">
                  {metrics.sla_at_risk} case{metrics.sla_at_risk !== 1 ? 's' : ''} at risk
                  {metrics.sla_breached > 0 && ` · ${metrics.sla_breached} breached`}
                </p>
              </div>
            </div>
            <Link href="/app/cases?sla_at_risk=true">
              <Button size="sm">Review queue <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </Card>
      )}

      <SectionHeader title="Operations" description="Queue volume and analyst velocity" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open Cases" value={openCases} sub="Active in workflow" icon={FolderOpen} tone="primary" />
        <KpiCard
          label="Avg Triage Time"
          value={`${metrics.avg_time_to_triage_minutes}m`}
          sub="Created → triaged"
          icon={Clock}
        />
        <KpiCard
          label="Avg Disposition Time"
          value={`${metrics.avg_time_to_disposition_minutes}m`}
          sub="Created → dispositioned"
          icon={Clock}
        />
        <KpiCard
          label="Analysts Loaded"
          value={workloadData.length}
          sub="With open assignments"
          icon={Users}
        />
      </div>

      <SectionHeader title="SLA Governance" description="Service-level commitments across managed clients" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label="SLA At Risk"
          value={metrics.sla_at_risk}
          sub="Approaching breach window"
          icon={AlertTriangle}
          tone={metrics.sla_at_risk > 0 ? 'warning' : 'success'}
        />
        <KpiCard
          label="SLA Breached"
          value={metrics.sla_breached}
          sub="Past commitment deadline"
          icon={Shield}
          tone={metrics.sla_breached > 0 ? 'danger' : 'success'}
        />
      </div>

      <SectionHeader title="AI & QA" description="Human-in-the-loop decision quality indicators" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="AI Acceptance Rate"
          value={`${metrics.ai_acceptance_rate}%`}
          sub="Analyst accepted AI recommendation"
          icon={Brain}
          tone={metrics.ai_acceptance_rate >= 70 ? 'success' : 'default'}
        />
        <KpiCard
          label="AI Override Rate"
          value={`${metrics.ai_override_rate}%`}
          sub="Modified or rejected AI output"
          icon={Brain}
          tone={metrics.ai_override_rate > 30 ? 'warning' : 'default'}
        />
        <KpiCard
          label="QA Average Score"
          value={metrics.qa_average_score || '—'}
          sub="Manager quality reviews"
          icon={ClipboardCheck}
          tone={(metrics.qa_average_score || 0) >= 80 ? 'success' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle>Cases by Priority</CardTitle>
          <p className="mt-1 text-xs text-muted">Open and closed cases in the organization</p>
          {priorityData.length === 0 ? (
            <EmptyState title="No cases" description="Cases will appear here once ingested or created." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#71767b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Cases" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Cases by Status</CardTitle>
          <p className="mt-1 text-xs text-muted">Lifecycle distribution</p>
          {statusData.length === 0 ? (
            <EmptyState title="No status data" description="No cases in the queue yet." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11, color: '#71767b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>Analyst Workload</CardTitle>
          <p className="mt-1 text-xs text-muted">Open case assignments by analyst</p>
          {workloadData.length === 0 ? (
            <EmptyState title="No assignments" description="Open cases will show analyst workload here." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, workloadData.length * 36)}>
              <BarChart data={workloadData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#71767b' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fill: '#71767b', fontSize: 12 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Open cases" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <CardTitle>SLA At Risk</CardTitle>
              <p className="mt-1 text-xs text-muted">Cases needing manager attention</p>
            </div>
            <Link href="/app/cases?sla_at_risk=true" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {atRiskCases.length === 0 ? (
            <EmptyState title="All clear" description="No cases currently at SLA risk." />
          ) : (
            <ul className="space-y-2">
              {atRiskCases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/cases/${c.id}`}
                    className="block rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.title}</div>
                        <div className="mt-1 text-xs text-muted">{c.case_number} · {c.client_name || 'Client'}</div>
                      </div>
                      <SlaBadge status={c.sla_status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-xs text-muted">{c.status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
