'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LoadingState, ErrorState } from '@/components/ui/states';

const COLORS = ['#1d9bf0', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function ManagerDashboard() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Record<string, unknown>>('/dashboards/soc-manager')
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading manager dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!metrics) return null;

  const priorityData = Object.entries((metrics.cases_by_priority as Record<string, number>) || {}).map(([name, value]) => ({ name, value }));
  const statusData = Object.entries((metrics.cases_by_status as Record<string, number>) || {}).map(([name, value]) => ({ name, value }));
  const workloadData = Object.entries((metrics.analyst_workload as Record<string, number>) || {}).map(([name, value]) => ({ name, value }));

  const widgets = [
    { label: 'Total Open Cases', value: metrics.total_open_cases },
    { label: 'SLA At Risk', value: metrics.sla_at_risk },
    { label: 'SLA Breached', value: metrics.sla_breached },
    { label: 'Avg Time to Triage (min)', value: metrics.avg_time_to_triage_minutes },
    { label: 'Avg Time to Disposition (min)', value: metrics.avg_time_to_disposition_minutes },
    { label: 'AI Acceptance Rate', value: `${metrics.ai_acceptance_rate}%` },
    { label: 'AI Override Rate', value: `${metrics.ai_override_rate}%` },
    { label: 'QA Average Score', value: metrics.qa_average_score },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">SOC Manager Dashboard</h1>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {widgets.map((w) => (
          <Card key={w.label}>
            <div className="text-sm text-muted">{w.label}</div>
            <div className="mt-1 text-2xl font-bold">{String(w.value)}</div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Cases by Priority</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#71767b' }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#1d9bf0" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Cases by Status</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Analyst Workload</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workloadData}>
              <XAxis dataKey="name" tick={{ fill: '#71767b' }} />
              <YAxis tick={{ fill: '#71767b' }} />
              <Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
