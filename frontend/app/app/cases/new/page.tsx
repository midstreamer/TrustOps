'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SEVERITIES, PRIORITIES } from '@/lib/utils';

export default function NewCasePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_id: '', title: '', description: '', source_system: '', source_alert_id: '',
    severity: 'Medium', priority: 'P3 Medium', detected_at: '',
    asset_name: '', username: '', source_ip: '', destination_ip: '', raw_event: '',
  });

  useEffect(() => {
    api<Client[]>('/clients').then(setClients).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        detected_at: form.detected_at ? new Date(form.detected_at).toISOString() : null,
      };
      const c = await api<{ id: string }>('/cases', { method: 'POST', body: JSON.stringify(payload) });
      router.push(`/app/cases/${c.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create Case</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label className="mb-1 block text-sm text-muted">Client</label>
          <Select value={form.client_id} onChange={(e) => set('client_id', e.target.value)} required>
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Title</label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Description</label>
          <textarea className="w-full rounded-lg border border-border bg-card px-3 py-2" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Source System</label>
            <Input value={form.source_system} onChange={(e) => set('source_system', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Source Alert ID</label>
            <Input value={form.source_alert_id} onChange={(e) => set('source_alert_id', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Severity</label>
            <Select value={form.severity} onChange={(e) => set('severity', e.target.value)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Priority</label>
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Detected At</label>
          <Input type="datetime-local" value={form.detected_at} onChange={(e) => set('detected_at', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="mb-1 block text-sm text-muted">Asset Name</label><Input value={form.asset_name} onChange={(e) => set('asset_name', e.target.value)} /></div>
          <div><label className="mb-1 block text-sm text-muted">Username</label><Input value={form.username} onChange={(e) => set('username', e.target.value)} /></div>
          <div><label className="mb-1 block text-sm text-muted">Source IP</label><Input value={form.source_ip} onChange={(e) => set('source_ip', e.target.value)} /></div>
          <div><label className="mb-1 block text-sm text-muted">Destination IP</label><Input value={form.destination_ip} onChange={(e) => set('destination_ip', e.target.value)} /></div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">Raw Event</label>
          <textarea className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm" rows={4} value={form.raw_event} onChange={(e) => set('raw_event', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Case'}</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
