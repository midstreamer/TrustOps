'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client, IntegrationKey, IntegrationKeyCreated } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { AlertTriangle, Copy, KeyRound } from 'lucide-react';

const INTEGRATIONS = [
  { name: 'Microsoft Sentinel', source: 'Sentinel' },
  { name: 'Generic Webhook', source: 'Webhook' },
];

export default function IntegrationKeysPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<IntegrationKeyCreated | null>(null);
  const [integrationName, setIntegrationName] = useState(INTEGRATIONS[0].name);
  const [sourceSystem, setSourceSystem] = useState(INTEGRATIONS[0].source);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const c = await api<Client[]>('/clients');
      setClients(c);
      const selected = clientId || c[0]?.id || '';
      setClientId(selected);
      if (selected) {
        const k = await api<IntegrationKey[]>(`/integration-keys/clients/${selected}`);
        setKeys(k);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!clientId) return;
    try {
      const result = await api<IntegrationKeyCreated>(`/integration-keys/clients/${clientId}`, {
        method: 'POST',
        body: JSON.stringify({ integration_name: integrationName, source_system: sourceSystem }),
      });
      setNewKey(result);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const action = async (keyId: string, type: 'rotate' | 'revoke' | 'disable') => {
    try {
      if (type === 'rotate') {
        const result = await api<IntegrationKeyCreated>(`/integration-keys/${keyId}/${type}`, { method: 'POST' });
        setNewKey(result);
      } else {
        await api(`/integration-keys/${keyId}/${type}`, { method: 'POST' });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `${type} failed`);
    }
  };

  const copyKey = () => {
    if (newKey?.raw_key) navigator.clipboard.writeText(newKey.raw_key);
  };

  if (loading && !clients.length) {
    return <AdminShell title="Integration Keys"><LoadingState message="Loading..." /></AdminShell>;
  }

  return (
    <AdminShell title="Integration Keys">
      {error && <ErrorState message={error} />}

      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-yellow-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          For security, raw integration keys are shown only once. Store the key securely before closing this dialog.
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Client</label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Integration</label>
            <Select
              value={integrationName}
              onChange={(e) => {
                const opt = INTEGRATIONS.find((i) => i.name === e.target.value) || INTEGRATIONS[0];
                setIntegrationName(opt.name);
                setSourceSystem(opt.source);
              }}
            >
              {INTEGRATIONS.map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={createKey}><KeyRound className="mr-2 h-4 w-4" />Create Key</Button>
          </div>
        </div>
      </Card>

      {newKey?.raw_key && (
        <Card className="mb-6 border-green-900/40 bg-green-900/10">
          <p className="mb-2 text-sm font-medium">New key — copy now</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-2 py-1 text-xs">{newKey.raw_key}</code>
            <Button size="sm" variant="secondary" onClick={copyKey}><Copy className="mr-1 h-3 w-3" />Copy</Button>
            <Button size="sm" variant="secondary" onClick={() => setNewKey(null)}>Dismiss</Button>
          </div>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/60 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2">Integration</th>
              <th className="px-3 py-2">Prefix</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last Used</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">No keys for this client</td></tr>
            ) : keys.map((k) => (
              <tr key={k.id} className="border-b border-border/50">
                <td className="px-3 py-2">{k.integration_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{k.key_prefix}</td>
                <td className="px-3 py-2"><Badge>{k.status}</Badge></td>
                <td className="px-3 py-2 text-xs text-muted">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2 text-xs text-muted">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {k.status === 'Active' && (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="secondary" onClick={() => action(k.id, 'rotate')}>Rotate</Button>
                      <Button size="sm" variant="secondary" onClick={() => action(k.id, 'disable')}>Disable</Button>
                      <Button size="sm" variant="secondary" onClick={() => action(k.id, 'revoke')}>Revoke</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
