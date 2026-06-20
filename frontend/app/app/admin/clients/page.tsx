'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', industry: '', service_tier: 'Standard', timezone: 'UTC' });
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await api<Client[]>('/clients'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) return;
    try {
      if (editId) {
        await api(`/clients/${editId}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await api('/clients', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm({ name: '', industry: '', service_tier: 'Standard', timezone: 'UTC' });
      setEditId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const startEdit = (c: Client) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      industry: c.industry || '',
      service_tier: c.service_tier || 'Standard',
      timezone: c.timezone,
    });
  };

  if (loading) return <AdminShell title="Clients"><LoadingState message="Loading clients..." /></AdminShell>;

  return (
    <AdminShell title="Clients">
      {error && <ErrorState message={error} />}
      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-medium">{editId ? 'Edit Client' : 'Create Client'}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          <Select value={form.service_tier} onChange={(e) => setForm({ ...form, service_tier: e.target.value })}>
            {['Premium', 'Standard', 'Basic'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button onClick={save}>{editId ? 'Update' : 'Create'}</Button>
            {editId && <Button variant="secondary" onClick={() => { setEditId(null); setForm({ name: '', industry: '', service_tier: 'Standard', timezone: 'UTC' }); }}>Cancel</Button>}
          </div>
        </div>
      </Card>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/60 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.service_tier || '—'}</td>
                <td className="px-3 py-2"><Badge>{c.status}</Badge></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(c)}>Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
