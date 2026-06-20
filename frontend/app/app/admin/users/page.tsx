'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client, User } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';

const ROLES = ['Platform Admin', 'SOC Manager', 'SOC Analyst', 'Client Admin', 'Client Viewer'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: 'TrustOps123!', role: 'SOC Analyst', client_id: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([api<User[]>('/users'), api<Client[]>('/clients')]);
      setUsers(u);
      setClients(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          roles: [form.role],
          client_id: form.client_id || null,
        }),
      });
      setForm({ name: '', email: '', password: 'TrustOps123!', role: 'SOC Analyst', client_id: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const toggleStatus = async (user: User) => {
    const next = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const isClientRole = form.role.startsWith('Client');

  if (loading) return <AdminShell title="Users"><LoadingState message="Loading users..." /></AdminShell>;

  return (
    <AdminShell title="Users">
      {error && <ErrorState message={error} />}
      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-medium">Create User</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          {isClientRole && (
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          <Button onClick={create}>Create User</Button>
        </div>
      </Card>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/60 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="px-3 py-2 text-xs">{u.email}</td>
                <td className="px-3 py-2 text-xs">{u.roles.join(', ')}</td>
                <td className="px-3 py-2"><Badge>{u.status}</Badge></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="secondary" onClick={() => toggleStatus(u)}>
                    {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
