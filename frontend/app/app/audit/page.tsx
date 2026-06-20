'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import type { AuditLogList, Client } from '@/types';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const EVENT_TYPES = [
  '',
  'case_created',
  'ai_recommendation_generated',
  'analyst_decision_submitted',
  'qa_review_submitted',
  'report_published',
  'sentinel_alert_ingested',
  'webhook_alert_ingested',
];

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogList | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    client_id: '',
    event_type: '',
    search: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    api<Client[]>('/clients').then(setClients).catch(console.error);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.client_id) params.set('client_id', filters.client_id);
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.search) params.set('search', filters.search);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      params.set('limit', '50');
      const result = await api<AuditLogList>(`/audit-logs?${params}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="mt-1 text-sm text-muted">Provider-level audit trail for cases, AI, QA, reports, and integrations.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <Select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={filters.event_type} onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}>
          {EVENT_TYPES.map((t) => (
            <option key={t || 'all'} value={t}>{t ? t.replace(/_/g, ' ') : 'All event types'}</option>
          ))}
        </Select>
        <Input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <Input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        <Input placeholder="Search case or user..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
      </div>

      {error && <ErrorState message={error} />}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              {['', 'Time', 'Event', 'Case', 'Client', 'User'].map((h) => (
                <th key={h || 'exp'} className="px-4 py-3 text-left font-medium text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8"><LoadingState message="Loading audit log..." /></td></tr>
            ) : !data?.items.length ? (
              <tr><td colSpan={6} className="px-4 py-8"><EmptyState title="No audit events" description="Adjust filters or perform actions in the platform." /></td></tr>
            ) : data.items.map((row) => (
              <Fragment key={row.id}>
                <tr className="border-b border-border hover:bg-card/50">
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      className="text-muted"
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                      {expanded === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.event_type_label}</td>
                  <td className="px-4 py-3">
                    {row.case_id ? (
                      <Link href={`/app/cases/${row.case_id}`} className="font-mono text-primary hover:underline">
                        {row.case_number || row.case_id.slice(0, 8)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{row.client_name || '—'}</td>
                  <td className="px-4 py-3">{row.user_name || '—'}</td>
                </tr>
                {expanded === row.id && (
                  <tr className="border-b border-border bg-background/40">
                    <td colSpan={6} className="px-6 py-3">
                      <div className="grid gap-4 md:grid-cols-2 text-xs font-mono">
                        <div>
                          <p className="mb-1 text-muted">Previous</p>
                          <pre className="max-h-40 overflow-auto rounded bg-card p-2">{JSON.stringify(row.previous_value_json, null, 2) || '—'}</pre>
                        </div>
                        <div>
                          <p className="mb-1 text-muted">New</p>
                          <pre className="max-h-40 overflow-auto rounded bg-card p-2">{JSON.stringify(row.new_value_json, null, 2) || '—'}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {data && (
        <p className="mt-3 text-xs text-muted">
          Showing {data.items.length} of {data.total} events
        </p>
      )}
    </div>
  );
}
