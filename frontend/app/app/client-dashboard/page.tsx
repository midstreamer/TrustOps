'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clientId = user?.client_id;
    const path = clientId ? `/dashboards/client/${clientId}` : '/dashboards/executive';
    api<Record<string, unknown>>(path)
      .then(setMetrics)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="text-muted">Loading client dashboard...</div>;
  if (error) return <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-4 text-red-300">{error}</div>;
  if (!metrics) return null;

  const severityData = Object.entries((metrics.cases_by_severity as Record<string, number>) || {}).map(([name, value]) => ({ name, value }));
  const dispositionData = Object.entries((metrics.cases_by_disposition as Record<string, number>) || {}).map(([name, value]) => ({ name, value }));
  const reports = (metrics.monthly_reports as Array<{ id: string; title: string; status: string }>) || [];
  const notable = (metrics.notable_incidents as Array<{ title: string; severity: string }>) || [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Client Dashboard</h1>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><div className="text-sm text-muted">Open Cases</div><div className="text-2xl font-bold">{String(metrics.open_cases)}</div></Card>
        <Card><div className="text-sm text-muted">Closed This Month</div><div className="text-2xl font-bold">{String(metrics.closed_cases_this_month)}</div></Card>
        <Card><div className="text-sm text-muted">SLA Performance</div><div className="text-2xl font-bold">{String(metrics.sla_performance)}%</div></Card>
        <Card><div className="text-sm text-muted">Notable Incidents</div><div className="text-2xl font-bold">{notable.length}</div></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Cases by Severity</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={severityData}><XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 11 }} /><YAxis tick={{ fill: '#71767b' }} /><Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} /><Bar dataKey="value" fill="#1d9bf0" /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Cases by Disposition</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dispositionData}><XAxis dataKey="name" tick={{ fill: '#71767b', fontSize: 10 }} /><YAxis tick={{ fill: '#71767b' }} /><Tooltip contentStyle={{ background: '#1a1f26', border: '1px solid #2f3336' }} /><Bar dataKey="value" fill="#10b981" /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Notable Incidents</CardTitle>
          <ul className="mt-2 space-y-2 text-sm">
            {notable.map((n, i) => (
              <li key={i} className="rounded-lg bg-background p-2">{n.title} <span className="text-muted">({n.severity})</span></li>
            ))}
            {notable.length === 0 && <li className="text-muted">No notable incidents</li>}
          </ul>
        </Card>
        <Card>
          <CardTitle>Monthly Reports</CardTitle>
          <ul className="mt-2 space-y-2 text-sm">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/app/reports/${r.id}`} className="text-primary hover:underline">{r.title}</Link>
                <span className="ml-2 text-muted">({r.status})</span>
              </li>
            ))}
            {reports.length === 0 && <li className="text-muted">No published reports</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
