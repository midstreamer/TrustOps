'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { TrustMetrics } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1d9bf0', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TrustMetricsPage() {
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<TrustMetrics>('/dashboards/trust-metrics')
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading trust metrics..." />;
  if (error) return <ErrorState message={error} />;
  if (!metrics) return null;

  const actionData = Object.entries(metrics.ai_action_breakdown || {}).map(([name, value]) => ({ name, value }));
  const analystOverrides = Object.entries(metrics.overrides_by_analyst || {}).map(([name, value]) => ({ name, value }));
  const dispositionOverrides = Object.entries(metrics.overrides_by_disposition || {}).map(([name, value]) => ({ name, value }));
  const overrideCategories = Object.entries(metrics.override_reasons_by_category || {}).map(([name, value]) => ({ name, value }));
  const disagreementBySeverity = Object.entries(metrics.human_ai_disagreement_rate_by_severity || {}).map(([name, value]) => ({ name, value }));

  const widgets = [
    { label: 'AI Recommendations', value: metrics.ai_recommendation_count },
    { label: 'Acceptance Rate', value: `${metrics.ai_acceptance_rate}%` },
    { label: 'Human-AI Agreement', value: `${metrics.human_ai_agreement_rate}%` },
    { label: 'Override Count', value: metrics.override_count },
    { label: 'High-Conf Accepted', value: metrics.ai_high_confidence_accepted },
    { label: 'High-Conf Rejected', value: metrics.ai_high_confidence_rejected },
    { label: 'Low-Conf Escalations', value: metrics.analyst_low_confidence_escalations },
    { label: 'QA Reversal Rate', value: `${metrics.decision_reversal_rate_after_qa}%` },
    { label: 'QA Override Accuracy', value: `${metrics.qa_confirmed_override_accuracy}%` },
  ];

  const components = metrics.trust_calibration_components;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Trust Metrics</h1>
      <p className="mb-6 text-sm text-muted">Human-AI decision quality analytics for SOC operations</p>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Trust Calibration Score</CardTitle>
            <p className="mt-2 text-sm text-muted max-w-2xl">
              {metrics.trust_calibration_definition}
            </p>
            {components && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                <span>Agreement: {components.agreement_component}%</span>
                <span>High-conf alignment: {components.high_confidence_alignment}%</span>
                <span>QA validation: {components.qa_validation_component}%</span>
              </div>
            )}
          </div>
          <div className="text-4xl font-bold text-primary">{metrics.trust_calibration_score}</div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {widgets.map((w) => (
          <Card key={w.label}>
            <div className="text-xs text-muted">{w.label}</div>
            <div className="mt-1 text-xl font-bold">{w.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>AI Action Breakdown</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={actionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {actionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Override Reasons by Category</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={overrideCategories}>
              <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#71767b' }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Human-AI Disagreement by Severity</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={disagreementBySeverity}>
              <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#71767b' }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#ef4444" name="Disagreement %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Overrides by Analyst</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analystOverrides}>
              <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#71767b' }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Overrides by Disposition</CardTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dispositionOverrides} layout="vertical">
              <XAxis type="number" tick={{ fill: '#71767b' }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fill: '#71767b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
