'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Case, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SeverityBadge, SlaBadge, AiConfidenceBadge } from '@/components/ui/badges';
import { QualityBadge } from '@/components/dashboard/quality-badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { SEVERITIES, PRIORITIES, STATUSES } from '@/lib/utils';
import { Plus, Upload, Search } from 'lucide-react';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    client_id: '', severity: '', priority: '', status: '',
    assigned_to_me: false, sla_at_risk: false, sla_breached: false, low_quality: false, search: '',
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const slaAtRisk = searchParams.get('sla_at_risk') === 'true';
    const slaBreached = searchParams.get('sla_breached') === 'true';
    const lowQuality = searchParams.get('low_quality') === 'true';
    if (slaAtRisk || slaBreached || lowQuality) {
      setFilters((prev) => ({
        ...prev,
        sla_at_risk: slaAtRisk,
        sla_breached: slaBreached,
        low_quality: lowQuality,
      }));
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.client_id) params.set('client_id', filters.client_id);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.status) params.set('status', filters.status);
      if (filters.assigned_to_me) params.set('assigned_to_me', 'true');
      if (filters.sla_at_risk) params.set('sla_at_risk', 'true');
      if (filters.sla_breached) params.set('sla_breached', 'true');
      if (filters.low_quality) params.set('low_quality', 'true');
      if (filters.search) params.set('search', filters.search);
      const [casesData, clientsData] = await Promise.all([
        api<Case[]>(`/cases?${params}`),
        api<Client[]>('/clients'),
      ]);
      setCases(casesData);
      setClients(clientsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { apiUpload } = await import('@/lib/api');
      const preview = await apiUpload<{ id: string; preview_json: { valid_rows: unknown[]; failed_rows: unknown[] } }>(
        '/imports/alerts/csv', file
      );
      if (confirm(`Import ${preview.preview_json.valid_rows.length} alerts? (${preview.preview_json.failed_rows.length} failed)`)) {
        await api(`/imports/${preview.id}/confirm`, { method: 'POST' });
        load();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">SOC Case Queue</h1>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-border/50">
            <Upload className="h-4 w-4" />
            Import Alerts
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <Link href="/app/cases/new">
            <Button><Plus className="mr-2 h-4 w-4" /> Create Case</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <Select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}>
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.assigned_to_me} onChange={(e) => setFilters({ ...filters, assigned_to_me: e.target.checked })} />
          Assigned to Me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.sla_at_risk} onChange={(e) => setFilters({ ...filters, sla_at_risk: e.target.checked })} />
          SLA At Risk
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.sla_breached} onChange={(e) => setFilters({ ...filters, sla_breached: e.target.checked })} />
          SLA Breached
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.low_quality} onChange={(e) => setFilters({ ...filters, low_quality: e.target.checked })} />
          Low Quality
        </label>
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-9" placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
      </div>

      {error && <ErrorState message={error} />}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              {['Case Number', 'Client', 'Title', 'Severity', 'Quality', 'Priority', 'Status', 'Assigned Analyst', 'SLA Status', 'AI Confidence', 'Created'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-8"><LoadingState message="Loading case queue..." /></td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-8"><EmptyState title="No cases found" description="Adjust filters or create a new case." /></td></tr>
            ) : cases.map((c) => (
              <tr key={c.id} className="border-b border-border hover:bg-card/50 cursor-pointer" onClick={() => router.push(`/app/cases/${c.id}`)}>
                <td className="px-4 py-3 font-mono text-primary">{c.case_number}</td>
                <td className="px-4 py-3">{c.client_name}</td>
                <td className="px-4 py-3 max-w-xs truncate">{c.title}</td>
                <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                <td className="px-4 py-3">{c.quality ? <QualityBadge quality={c.quality} compact /> : '—'}</td>
                <td className="px-4 py-3">{c.priority || '—'}</td>
                <td className="px-4 py-3">{c.status}</td>
                <td className="px-4 py-3">{c.assigned_to_name || '—'}</td>
                <td className="px-4 py-3"><SlaBadge status={c.sla_status} /></td>
                <td className="px-4 py-3"><AiConfidenceBadge score={c.ai_confidence} /></td>
                <td className="px-4 py-3 text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
