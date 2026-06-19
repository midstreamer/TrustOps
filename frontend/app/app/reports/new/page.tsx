'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

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
    api<Client[]>('/clients').then((c) => {
      setClients(c);
      if (c[0]) setForm((f) => ({ ...f, client_id: c[0].id }));
    });
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
      <Link href="/app/reports" className="mb-4 inline-flex items-center text-sm text-muted hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Reports
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Generate Monthly Report</h1>
      <p className="mb-6 text-sm text-muted">
        Create a draft client value report from case activity, SLA data, and trust metrics for the selected period.
      </p>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Report Parameters</CardTitle>
        </div>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Client *</label>
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Period start *</label>
              <Input type="date" value={form.reporting_period_start} onChange={(e) => setForm({ ...form, reporting_period_start: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Period end *</label>
              <Input type="date" value={form.reporting_period_end} onChange={(e) => setForm({ ...form, reporting_period_end: e.target.value })} required />
            </div>
          </div>
          <Button type="submit" disabled={loading || !form.client_id}>
            {loading ? 'Generating…' : 'Generate Draft Report'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
