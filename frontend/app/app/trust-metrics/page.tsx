'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import {
  CHART_COLORS, ComponentBar, KpiCard, SectionHeader, tooltipStyle,
} from '@/components/dashboard/kpi-card';
import type { Client, TrustMetrics, TrustMetricsDrilldown } from '@/types';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  Brain, CheckCircle2, ClipboardCheck, FileText, Filter, LayoutDashboard,
  RefreshCw, Scale, Sparkles, ThumbsUp, TrendingUp, Users, XCircle,
} from 'lucide-react';

const AI_ACTION_COLORS: Record<string, string> = {
  Accepted: '#10b981',
  Modified: '#f59e0b',
  Rejected: '#ef4444',
  Escalated: '#8b5cf6',
  'Not Used': '#71767b',
};

export default function TrustMetricsPage() {
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [drilldown, setDrilldown] = useState<TrustMetricsDrilldown | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const openDrilldown = async (type: string) => {
    setDrilldownLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (clientId) params.set('client_id', clientId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const data = await api<TrustMetricsDrilldown>(`/dashboards/trust-metrics/drilldown?${params}`);
      setDrilldown(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDrilldownLoading(false);
    }
  };

  useEffect(() => {
    api<Client[]>('/clients').then(setClients).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (clientId) params.set('client_id', clientId);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      const qs = params.toString();
      const data = await api<TrustMetrics>(`/dashboards/trust-metrics${qs ? `?${qs}` : ''}`);
      setMetrics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [clientId, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const clearFilters = () => {
    setClientId('');
    setStartDate('');
    setEndDate('');
  };

  if (loading && !metrics) return <LoadingState message="Loading trust metrics..." />;
  if (error && !metrics) return <ErrorState message={error} />;
  if (!metrics) return null;

  const actionData = Object.entries(metrics.ai_action_breakdown || {})
    .map(([name, value]) => ({ name, value, fill: AI_ACTION_COLORS[name] || CHART_COLORS[0] }))
    .sort((a, b) => b.value - a.value);

  const analystOverrides = Object.entries(metrics.overrides_by_analyst || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const dispositionOverrides = Object.entries(metrics.overrides_by_disposition || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const overrideCategories = Object.entries(metrics.override_reasons_by_category || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const disagreementBySeverity = Object.entries(metrics.human_ai_disagreement_rate_by_severity || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const trendData = metrics.weekly_trends || [];
  const components = metrics.trust_calibration_components;
  const score = metrics.trust_calibration_score;
  const clientLabel = clientId
    ? clients.find((c) => c.id === clientId)?.name || 'Selected client'
    : 'All clients';
  const hasDecisions = (metrics.decision_count ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trust Metrics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Human-AI decision quality analytics for pilot QBRs — measure alignment, overrides, and QA validation over time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/manager">
            <Button variant="secondary" size="sm">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manager Dashboard
            </Button>
          </Link>
          <Link href="/app/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Client Reports
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <CardTitle>Filters</CardTitle>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Client</label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="min-w-[180px]">
              <option value="">All clients</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Start date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">End date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
          <Button onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Loading…' : 'Apply'}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full border border-border bg-background px-2.5 py-1">{clientLabel}</span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1">
            {startDate || endDate ? `${startDate || '…'} → ${endDate || '…'}` : 'All time'}
          </span>
          {metrics.decision_count != null && (
            <span className="rounded-full border border-border bg-background px-2.5 py-1">
              {metrics.decision_count} decisions
            </span>
          )}
        </div>
      </Card>

      <Card className={cn(
        'mb-6 border-primary/30 bg-primary/5',
        score >= 80 && 'border-green-900/40 bg-green-900/10',
        score > 0 && score < 60 && 'border-yellow-900/40 bg-yellow-900/10',
      )}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle>Trust Calibration Score</CardTitle>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              {metrics.trust_calibration_definition}
            </p>
            {components && (
              <div className="mt-5 grid max-w-xl gap-3">
                <ComponentBar label="Human-AI agreement" value={components.agreement_component} weight="50%" />
                <ComponentBar label="High-confidence alignment" value={components.high_confidence_alignment} weight="30%" />
                <ComponentBar label="QA validation" value={components.qa_validation_component} weight="20%" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-center lg:min-w-[140px]">
            <div className={cn(
              'text-5xl font-bold tabular-nums',
              score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-300' : 'text-primary',
            )}>
              {score}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">out of 100</div>
            {!hasDecisions && (
              <p className="mt-3 max-w-[160px] text-center text-xs text-muted">
                Submit analyst decisions to populate calibration data.
              </p>
            )}
          </div>
        </div>
      </Card>

      {trendData.length > 0 && (
        <>
          <SectionHeader title="Weekly Trends" description="Acceptance rate and calibration score over the last 12 weeks" />
          <Card className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                <XAxis dataKey="week_label" tick={{ fill: '#71767b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71767b' }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="acceptance_rate"
                  name="Acceptance %"
                  stroke="#1d9bf0"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#1d9bf0' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="trust_calibration_score"
                  name="Calibration"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      <SectionHeader title="Decision Volume" description="Analyst decisions and AI recommendation activity in range" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Analyst Decisions"
          value={metrics.decision_count ?? '—'}
          sub="In selected range"
          icon={Users}
          tone="primary"
        />
        <KpiCard
          label="AI Recommendations"
          value={metrics.ai_recommendation_count}
          sub="Generated for cases"
          icon={Sparkles}
        />
        <KpiCard
          label="Avg AI Confidence"
          value={`${metrics.average_ai_confidence}%`}
          sub="Model output score"
          icon={Brain}
        />
        <KpiCard
          label="Avg Analyst Confidence"
          value={`${metrics.average_analyst_confidence}%`}
          sub="Self-reported at decision"
          icon={CheckCircle2}
        />
      </div>

      <SectionHeader title="AI Alignment" description="How analysts interact with AI triage recommendations" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Acceptance Rate"
          value={`${metrics.ai_acceptance_rate}%`}
          sub="Accepted AI as-is"
          icon={ThumbsUp}
          tone={metrics.ai_acceptance_rate >= 70 ? 'success' : 'default'}
        />
        <KpiCard
          label="Human-AI Agreement"
          value={`${metrics.human_ai_agreement_rate}%`}
          sub="Click to view disagreement cases"
          icon={Scale}
          tone={metrics.human_ai_agreement_rate >= 75 ? 'success' : 'warning'}
          onClick={() => openDrilldown('human_ai_disagreement')}
        />
        <KpiCard
          label="Modification Rate"
          value={`${metrics.ai_modification_rate}%`}
          sub="Changed AI output"
          icon={TrendingUp}
          tone={metrics.ai_modification_rate > 25 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Override Count"
          value={metrics.override_count}
          sub={`${metrics.ai_rejection_rate}% rejected — click to drill down`}
          icon={XCircle}
          tone={metrics.override_count > 0 ? 'warning' : 'success'}
          onClick={() => openDrilldown('analyst_override')}
        />
      </div>

      <SectionHeader title="Confidence Signals" description="High- and low-confidence decision patterns" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="High-Conf Accepted"
          value={metrics.ai_high_confidence_accepted}
          sub="AI ≥80% and accepted"
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="High-Conf Rejected"
          value={metrics.ai_high_confidence_rejected}
          sub="AI ≥80% but overridden — click to drill down"
          icon={XCircle}
          tone={metrics.ai_high_confidence_rejected > 0 ? 'warning' : 'default'}
          onClick={() => openDrilldown('high_confidence_ai_rejected')}
        />
        <KpiCard
          label="Low-Conf Escalations"
          value={metrics.analyst_low_confidence_escalations}
          sub="Analyst uncertainty escalations"
          icon={TrendingUp}
        />
      </div>

      <SectionHeader title="QA Oversight" description="Manager quality review outcomes" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="QA Reviews"
          value={metrics.qa_review_count}
          sub="Completed reviews"
          icon={ClipboardCheck}
        />
        <KpiCard
          label="Reversal Rate"
          value={`${metrics.decision_reversal_rate_after_qa}%`}
          sub="Click to view QA-reversed cases"
          icon={XCircle}
          tone={metrics.decision_reversal_rate_after_qa > 15 ? 'warning' : 'default'}
          onClick={() => openDrilldown('qa_reversed')}
        />
        <KpiCard
          label="Override Accuracy"
          value={`${metrics.qa_confirmed_override_accuracy}%`}
          sub="QA-confirmed overrides"
          icon={CheckCircle2}
          tone={metrics.qa_confirmed_override_accuracy >= 80 ? 'success' : 'default'}
        />
      </div>

      <SectionHeader title="Breakdowns" description="Distribution of AI actions, overrides, and disagreements" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle>AI Action Breakdown</CardTitle>
          <p className="mt-1 text-xs text-muted">How analysts responded to AI recommendations</p>
          {actionData.length === 0 ? (
            <EmptyState title="No decisions yet" description="AI action breakdown appears after analyst decisions." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={actionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {actionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Override Reasons by Category</CardTitle>
          <p className="mt-1 text-xs text-muted">Why analysts modified or rejected AI output</p>
          {overrideCategories.length === 0 ? (
            <EmptyState title="No overrides" description="Override categories appear when analysts override AI." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overrideCategories} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#71767b', fontSize: 9 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fill: '#71767b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Overrides" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Disagreement by Severity</CardTitle>
          <p className="mt-1 text-xs text-muted">Human-AI disagreement rate per case severity</p>
          {disagreementBySeverity.length === 0 ? (
            <EmptyState title="No disagreement data" description="Requires decisions with agreement tracking." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={disagreementBySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71767b' }} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Disagreement %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Overrides by Analyst</CardTitle>
          <p className="mt-1 text-xs text-muted">Who is overriding AI most frequently</p>
          {analystOverrides.length === 0 ? (
            <EmptyState title="No analyst overrides" description="Per-analyst override counts will appear here." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, analystOverrides.length * 36)}>
              <BarChart data={analystOverrides} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#71767b' }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#71767b', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Overrides" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>Overrides by Disposition</CardTitle>
          <p className="mt-1 text-xs text-muted">Which dispositions analysts chose when overriding AI</p>
          {dispositionOverrides.length === 0 ? (
            <EmptyState title="No disposition overrides" description="Disposition breakdown appears with override activity." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, dispositionOverrides.length * 32)}>
              <BarChart data={dispositionOverrides} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#71767b' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={200}
                  tick={{ fill: '#71767b', fontSize: 10 }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Overrides" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {(drilldown || drilldownLoading) && (
        <Card className="mt-6 border-primary/30">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CardTitle>Metric Drilldown</CardTitle>
              <p className="mt-1 text-sm text-muted">
                These cases are driving this metric. {drilldown ? `${drilldown.total} total` : 'Loading…'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDrilldown(null)}>Close</Button>
          </div>
          {drilldownLoading ? (
            <LoadingState message="Loading cases..." />
          ) : drilldown && drilldown.items.length === 0 ? (
            <EmptyState title="No matching cases" description="No cases match this drilldown in the selected range." />
          ) : drilldown ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-muted">
                  <tr>
                    {['Case', 'Client', 'Title', 'Severity', 'AI Conf', 'Analyst Conf', 'Action', ''].map((h) => (
                      <th key={h || 'act'} className="px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drilldown.items.map((row) => (
                    <tr key={row.case_id} className="border-b border-border">
                      <td className="px-3 py-2 font-mono text-primary">{row.case_number}</td>
                      <td className="px-3 py-2">{row.client_name}</td>
                      <td className="max-w-xs truncate px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">{row.severity}</td>
                      <td className="px-3 py-2">{row.ai_confidence ?? '—'}</td>
                      <td className="px-3 py-2">{row.analyst_confidence}</td>
                      <td className="px-3 py-2">{row.ai_action}</td>
                      <td className="px-3 py-2">
                        <Link href={`/app/cases/${row.case_id}`}>
                          <Button size="sm" variant="secondary">Open Case</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
