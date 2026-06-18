'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client, SLAPolicy } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle } from '@/components/ui/card';
import { SEVERITIES, PRIORITIES } from '@/lib/utils';

export default function SLASettingsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    priority: '', severity: 'High',
    time_to_triage_minutes: 30, time_to_disposition_minutes: 120,
    time_to_notify_minutes: 60, time_to_close_minutes: 720,
    business_hours_only: false, active: true,
  });

  useEffect(() => {
    api<Client[]>('/clients').then((c) => { setClients(c); if (c[0]) setSelectedClient(c[0].id); });
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    api<SLAPolicy[]>(`/clients/${selectedClient}/sla-policies`).then(setPolicies);
  }, [selectedClient]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api(`/clients/${selectedClient}/sla-policies`, {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        priority: form.priority || null,
        severity: form.severity || null,
      }),
    });
    setShowModal(false);
    api<SLAPolicy[]>(`/clients/${selectedClient}/sla-policies`).then(setPolicies);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">SLA Configuration</h1>
      <div className="mb-4 flex items-center gap-4">
        <Select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button onClick={() => setShowModal(true)}>Add SLA Policy</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-card">
            <tr>
              {['Priority', 'Severity', 'Triage (min)', 'Disposition (min)', 'Notify (min)', 'Close (min)', 'Business Hours', 'Active'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="px-4 py-3">{p.priority || '—'}</td>
                <td className="px-4 py-3">{p.severity || '—'}</td>
                <td className="px-4 py-3">{p.time_to_triage_minutes}</td>
                <td className="px-4 py-3">{p.time_to_disposition_minutes}</td>
                <td className="px-4 py-3">{p.time_to_notify_minutes}</td>
                <td className="px-4 py-3">{p.time_to_close_minutes}</td>
                <td className="px-4 py-3">{p.business_hours_only ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">{p.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-md">
            <CardTitle>Add SLA Policy</CardTitle>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="">Any Priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="">Any Severity</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              {(['time_to_triage_minutes', 'time_to_disposition_minutes', 'time_to_notify_minutes', 'time_to_close_minutes'] as const).map((f) => (
                <div key={f}>
                  <label className="text-sm text-muted">{f.replace(/_/g, ' ')}</label>
                  <Input type="number" value={form[f]} onChange={(e) => setForm({ ...form, [f]: +e.target.value })} />
                </div>
              ))}
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.business_hours_only} onChange={(e) => setForm({ ...form, business_hours_only: e.target.checked })} /> Business Hours Only</label>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
