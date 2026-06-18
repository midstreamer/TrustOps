'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function NewReportPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    client_id: '',
    reporting_period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    reporting_period_end: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Client[]>('/clients').then((c) => { setClients(c); if (c[0]) setForm((f) => ({ ...f, client_id: c[0].id })); });
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const report = await api<{ id: string }>('/reports/generate', { method: 'POST', body: JSON.stringify(form) });
      router.push(`/app/reports/${report.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Generate Monthly Report</h1>
      <form onSubmit={handleGenerate} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="text-sm text-muted">Client</label>
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-sm text-muted">Period Start</label>
          <Input type="date" value={form.reporting_period_start} onChange={(e) => setForm({ ...form, reporting_period_start: e.target.value })} required />
        </div>
        <div>
          <label className="text-sm text-muted">Period End</label>
          <Input type="date" value={form.reporting_period_end} onChange={(e) => setForm({ ...form, reporting_period_end: e.target.value })} required />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate Draft'}</Button>
      </form>
    </div>
  );
}
