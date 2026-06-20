'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { KpiCard, SectionHeader } from '@/components/dashboard/kpi-card';
import { ManagerDashboardHeader } from '@/components/dashboard/manager/manager-dashboard-header';
import { ManagerSlaBanner } from '@/components/dashboard/manager/manager-sla-banner';
import { ManagerAnalyticsSection } from '@/components/dashboard/manager/manager-analytics-section';
import { ManagerSocChat } from '@/components/dashboard/manager-soc-chat';
import type { Case, SocManagerMetrics } from '@/types';
import { AlertTriangle, BarChart3, Brain, ClipboardCheck, Clock, FolderOpen, Shield, Users } from 'lucide-react';

export default function ManagerDashboard() {
  const [metrics, setMetrics] = useState<SocManagerMetrics | null>(null);
  const [atRiskCases, setAtRiskCases] = useState<Case[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading manager dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!metrics) return null;

  const priorityData = Object.entries(metrics.cases_by_priority || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const statusData = Object.entries(metrics.cases_by_status || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const workloadData = Object.entries(metrics.analyst_workload || {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  const hasSlaIssues = metrics.sla_at_risk > 0 || metrics.sla_breached > 0;
  const openCases = metrics.total_open_cases;

  return (
    <div className="mx-auto max-w-[1600px]">
      <ManagerDashboardHeader
        hasSlaIssues={hasSlaIssues}
        slaAtRisk={metrics.sla_at_risk}
        slaBreached={metrics.sla_breached}
        openCases={openCases}
        onRefresh={() => load({ silent: true })}
        refreshing={refreshing}
      />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
      <ManagerSlaBanner atRisk={metrics.sla_at_risk} breached={metrics.sla_breached} />

      <SectionHeader
        title="Operations"
        description="Queue volume and analyst velocity"
        icon={FolderOpen}
      />
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

      <SectionHeader
        title="SLA Governance"
        description="Service-level commitments across managed clients"
        icon={Shield}
      />
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

      <SectionHeader
        title="AI & QA"
        description="Human-in-the-loop decision quality indicators"
        icon={Brain}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        <KpiCard
          label="Low Quality Cases"
          value={metrics.low_quality_cases ?? 0}
          sub="Score below 75"
          icon={AlertTriangle}
          tone={(metrics.low_quality_cases ?? 0) > 0 ? 'warning' : 'default'}
        />
        <Link href="/app/cases?low_quality=true" className="block">
          <KpiCard
            label="Needs QA"
            value={metrics.needs_qa_cases ?? 0}
            sub="QA review recommended — view queue"
            icon={ClipboardCheck}
            tone={(metrics.needs_qa_cases ?? 0) > 0 ? 'warning' : 'default'}
          />
        </Link>
      </div>

      <SectionHeader
        title="Analytics"
        description="Queue distribution, workload balance, and SLA exposure"
        icon={BarChart3}
      />
      <ManagerAnalyticsSection
        priorityData={priorityData}
        statusData={statusData}
        workloadData={workloadData}
        atRiskCases={atRiskCases}
      />
        </div>

        <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[min(100%,22rem)] xl:self-start 2xl:w-96">
          <ManagerSocChat layout="sidebar" />
        </aside>
      </div>
    </div>
  );
}
