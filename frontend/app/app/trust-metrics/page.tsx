'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { CHART_COLORS } from '@/components/dashboard/kpi-card';
import { TrustMetricsHeader } from '@/components/dashboard/trust-metrics/trust-metrics-header';
import { TrustMetricsFilters } from '@/components/dashboard/trust-metrics/trust-metrics-filters';
import { TrustCalibrationCard } from '@/components/dashboard/trust-metrics/trust-calibration-card';
import { TrustMetricsTrendsChart } from '@/components/dashboard/trust-metrics/trust-metrics-trends-chart';
import { TrustMetricsBreakdowns } from '@/components/dashboard/trust-metrics/trust-metrics-breakdowns';
import { TrustMetricsDecisionVolume } from '@/components/dashboard/trust-metrics/trust-metrics-decision-volume';
import { TrustMetricsAiAlignment } from '@/components/dashboard/trust-metrics/trust-metrics-ai-alignment';
import { TrustMetricsConfidenceSignals } from '@/components/dashboard/trust-metrics/trust-metrics-confidence-signals';
import { TrustMetricsQaOversight } from '@/components/dashboard/trust-metrics/trust-metrics-qa-oversight';
import { TrustMetricsDrilldownPanel } from '@/components/dashboard/trust-metrics/trust-metrics-drilldown';
import { TrustMetricsSocChat } from '@/components/dashboard/trust-metrics-soc-chat';
import type { Client, TrustMetrics, TrustMetricsDrilldown } from '@/types';

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
    setDrilldown(null);
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
    <div className="mx-auto max-w-[1600px]">
      <TrustMetricsHeader
        score={score}
        decisionCount={metrics.decision_count ?? 0}
        agreementRate={metrics.human_ai_agreement_rate}
        acceptanceRate={metrics.ai_acceptance_rate}
        onRefresh={load}
        refreshing={loading}
      />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
      <TrustMetricsFilters
        clients={clients}
        clientId={clientId}
        startDate={startDate}
        endDate={endDate}
        clientLabel={clientLabel}
        decisionCount={metrics.decision_count}
        loading={loading}
        onClientChange={setClientId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={clearFilters}
        onApply={load}
      />

      <TrustCalibrationCard
        score={score}
        definition={metrics.trust_calibration_definition}
        components={components}
        hasDecisions={hasDecisions}
      />

      {trendData.length > 0 && (
        <TrustMetricsTrendsChart data={trendData} />
      )}

      <TrustMetricsDecisionVolume metrics={metrics} />

      <TrustMetricsAiAlignment
        metrics={metrics}
        onDrilldown={openDrilldown}
      />

      <TrustMetricsConfidenceSignals
        metrics={metrics}
        onDrilldown={openDrilldown}
      />

      <TrustMetricsQaOversight
        metrics={metrics}
        onDrilldown={openDrilldown}
      />

      <TrustMetricsBreakdowns
        actionData={actionData}
        overrideCategories={overrideCategories}
        disagreementBySeverity={disagreementBySeverity}
        analystOverrides={analystOverrides}
        dispositionOverrides={dispositionOverrides}
      />

      <TrustMetricsDrilldownPanel
        drilldown={drilldown}
        loading={drilldownLoading}
        onClose={() => setDrilldown(null)}
      />
        </div>

        <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-[min(100%,22rem)] xl:self-start 2xl:w-96">
          <TrustMetricsSocChat
            layout="sidebar"
            clientId={clientId || undefined}
            startDate={startDate || undefined}
            endDate={endDate || undefined}
            clientLabel={clientLabel}
          />
        </aside>
      </div>
    </div>
  );
}
