'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';
import { useAuth, hasRole, ADMIN_SETUP_ROLES } from '@/hooks/useAuth';
import type { AdminOverview, Client, SLAPolicy, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, Circle, Copy, ExternalLink,
} from 'lucide-react';

const TABS = ['Overview', 'Clients', 'Users', 'SLA Policies', 'Sample Data'] as const;
type Tab = (typeof TABS)[number];

const PROVIDER_ROLES = ['Platform Admin', 'SOC Manager', 'SOC Analyst'];
const CLIENT_ROLES = ['Client Admin', 'Client Viewer'];
const SERVICE_TIERS = ['Premium', 'Standard', 'Basic'];

const SAMPLE_CSV = `client_name,title,severity,priority,source_system,description,asset_name,username
Apex Energy,Suspicious login from new country,High,P2 High,Microsoft Entra ID,Multiple failed logins,VPN-GW-01,jsmith`;

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Circle className="h-4 w-4 text-muted" />}
      <span className={done ? 'text-foreground' : 'text-muted'}>{label}</span>
    </div>
  );
}

export default function AdminSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isPlatformAdmin = hasRole(user, ['Platform Admin']);
  const [tab, setTab] = useState<Tab>('Overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [clientForm, setClientForm] = useState({
    name: '', industry: '', service_tier: 'Standard', timezone: 'UTC',
    primary_contact_name: '', primary_contact_email: '', apply_default_sla: true,
  });
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: 'TrustOps123!', role: 'SOC Analyst', client_id: '',
  });
  const [slaClientId, setSlaClientId] = useState('');
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [sampleClientId, setSampleClientId] = useState('');
  const [demoTitle, setDemoTitle] = useState('');

  const visibleTabs = isPlatformAdmin ? TABS : TABS.filter((t) => t !== 'Users');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, cl] = await Promise.all([
        api<AdminOverview>('/admin/overview'),
        api<Client[]>('/clients'),
      ]);
      setOverview(ov);
      setClients(cl);
      if (cl[0]) {
        setSlaClientId((prev) => prev || cl[0].id);
        setSampleClientId((prev) => prev || cl[0].id);
      }
      if (isPlatformAdmin) {
        const us = await api<User[]>('/users');
        setUsers(us);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (user && !hasRole(user, ADMIN_SETUP_ROLES)) {
      router.push('/app/cases');
      return;
    }
    load();
  }, [user, router, load]);

  useEffect(() => {
    if (!slaClientId) return;
    api<SLAPolicy[]>(`/clients/${slaClientId}/sla-policies`).then(setPolicies).catch(console.error);
  }, [slaClientId]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/clients', { method: 'POST', body: JSON.stringify(clientForm) });
    setClientForm({
      name: '', industry: '', service_tier: 'Standard', timezone: 'UTC',
      primary_contact_name: '', primary_contact_email: '', apply_default_sla: true,
    });
    flash('Client created with default SLA policies.');
    load();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const needsClient = CLIENT_ROLES.includes(userForm.role);
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role_names: [userForm.role],
        client_id: needsClient ? userForm.client_id || null : null,
      }),
    });
    setUserForm({ name: '', email: '', password: 'TrustOps123!', role: 'SOC Analyst', client_id: '' });
    flash('User created.');
    load();
  };

  const applyDefaultSla = async () => {
    if (!slaClientId) return;
    await api(`/admin/clients/${slaClientId}/default-sla-policies`, { method: 'POST' });
    flash('Default SLA policies applied.');
    api<SLAPolicy[]>(`/clients/${slaClientId}/sla-policies`).then(setPolicies);
    load();
  };

  const generateDemoCase = async () => {
    if (!sampleClientId) return;
    const result = await api<{ case_id: string; case_number: string }>(
      `/admin/clients/${sampleClientId}/demo-case`,
      { method: 'POST', body: JSON.stringify({ title: demoTitle || null }) },
    );
    flash(`Demo case ${result.case_number} created.`);
    load();
  };

  const importSampleCsv = async () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const file = new File([blob], 'trustops-sample-alerts.csv', { type: 'text/csv' });
    const preview = await apiUpload<{ id: string; preview_json: { valid_rows: unknown[] } }>(
      '/imports/alerts/csv', file,
    );
    await api(`/imports/${preview.id}/confirm`, { method: 'POST' });
    flash(`Imported ${preview.preview_json.valid_rows.length} sample alerts.`);
    load();
  };

  const copyClientId = (id: string) => {
    navigator.clipboard.writeText(id);
    flash('Client ID copied to clipboard.');
  };

  if (!hasRole(user, ADMIN_SETUP_ROLES)) return null;
  if (loading) return <LoadingState message="Loading admin setup..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Setup</h1>
        <p className="text-sm text-muted">
          Onboard managed clients for your MDR service — organization, users, SLA, and sample cases.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-900/50 bg-green-900/20 px-4 py-2 text-sm text-green-300">
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              tab === t ? 'bg-primary/20 text-primary' : 'text-muted hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && overview && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>Organization</CardTitle>
            <p className="mt-2 text-lg font-semibold">{overview.organization_name}</p>
            <p className="text-sm text-muted">Multi-client MDR provider mode</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted">Clients</span><div className="text-xl font-bold">{overview.client_count}</div></div>
              <div><span className="text-muted">Users</span><div className="text-xl font-bold">{overview.user_count}</div></div>
              <div><span className="text-muted">SLA Policies</span><div className="text-xl font-bold">{overview.sla_policy_count}</div></div>
              <div><span className="text-muted">Cases</span><div className="text-xl font-bold">{overview.case_count}</div></div>
            </div>
          </Card>
          <Card>
            <CardTitle>Setup Checklist</CardTitle>
            <div className="mt-4 space-y-2">
              <CheckItem done={overview.checklist.has_clients} label="At least one managed client" />
              <CheckItem done={overview.checklist.all_clients_have_sla} label="All clients have SLA policies" />
              <CheckItem done={overview.checklist.has_soc_users} label="SOC team users configured" />
              <CheckItem done={overview.checklist.all_clients_have_portal_users} label="Each client has a portal user" />
              <CheckItem done={overview.checklist.has_cases} label="At least one case in the queue" />
            </div>
            {overview.checklist.setup_complete ? (
              <p className="mt-4 text-sm text-green-400">Setup complete — ready for pilot operations.</p>
            ) : (
              <p className="mt-4 text-sm text-muted">Complete the checklist tabs to finish onboarding.</p>
            )}
          </Card>
          {overview.clients_without_sla.length > 0 && (
            <Card className="md:col-span-2">
              <CardTitle>Clients Missing SLA</CardTitle>
              <ul className="mt-2 text-sm text-yellow-200">
                {overview.clients_without_sla.map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </Card>
          )}
          {overview.clients_without_portal_users.length > 0 && (
            <Card className="md:col-span-2">
              <CardTitle>Clients Missing Portal Users</CardTitle>
              <p className="mt-1 text-xs text-muted">Add a Client Admin or Client Viewer for each managed client.</p>
              <ul className="mt-2 text-sm text-yellow-200">
                {overview.clients_without_portal_users.map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === 'Clients' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Add Managed Client</CardTitle>
            <form onSubmit={createClient} className="mt-4 space-y-3">
              <Input placeholder="Client name *" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required />
              <Input placeholder="Industry" value={clientForm.industry} onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })} />
              <Select value={clientForm.service_tier} onChange={(e) => setClientForm({ ...clientForm, service_tier: e.target.value })}>
                {SERVICE_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input placeholder="Timezone" value={clientForm.timezone} onChange={(e) => setClientForm({ ...clientForm, timezone: e.target.value })} />
              <Input placeholder="Primary contact name" value={clientForm.primary_contact_name} onChange={(e) => setClientForm({ ...clientForm, primary_contact_name: e.target.value })} />
              <Input placeholder="Primary contact email" type="email" value={clientForm.primary_contact_email} onChange={(e) => setClientForm({ ...clientForm, primary_contact_email: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={clientForm.apply_default_sla} onChange={(e) => setClientForm({ ...clientForm, apply_default_sla: e.target.checked })} />
                Apply default Critical/High SLA policies
              </label>
              <Button type="submit">Create Client</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Managed Clients ({clients.length})</CardTitle>
            {clients.length === 0 ? (
              <EmptyState title="No clients yet" description="Add your first managed client to begin MDR onboarding." />
            ) : (
              <div className="mt-4 space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted">{c.industry || '—'} · {c.service_tier || '—'}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="truncate text-xs text-primary">{c.id}</code>
                      <button type="button" onClick={() => copyClientId(c.id)} className="text-muted hover:text-foreground" title="Copy client ID for integrations">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'Users' && isPlatformAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Add User</CardTitle>
            <form onSubmit={createUser} className="mt-4 space-y-3">
              <Input placeholder="Full name *" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              <Input placeholder="Email *" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              <Input placeholder="Temporary password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                {[...PROVIDER_ROLES, ...CLIENT_ROLES].map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
              {CLIENT_ROLES.includes(userForm.role) && (
                <Select value={userForm.client_id} onChange={(e) => setUserForm({ ...userForm, client_id: e.target.value })} required>
                  <option value="">Select client *</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
              <Button type="submit">Create User</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Users ({users.length})</CardTitle>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-muted">{u.email}</div>
                  <div className="mt-1 text-xs">{u.roles.join(', ')}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'SLA Policies' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Select value={slaClientId} onChange={(e) => setSlaClientId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={applyDefaultSla}>Apply Default SLA Templates</Button>
            <Link href="/app/settings/sla"><Button variant="secondary"><ExternalLink className="mr-2 h-4 w-4" /> Advanced SLA Settings</Button></Link>
          </div>
          <Card>
            <CardTitle>SLA Policies</CardTitle>
            {policies.length === 0 ? (
              <EmptyState title="No SLA policies" description="Apply default templates or use Advanced SLA Settings." />
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead><tr className="text-left text-muted">{['Severity', 'Triage', 'Disposition', 'Notify', 'Close', 'Active'].map((h) => <th key={h} className="pb-2 pr-4">{h}</th>)}</tr></thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2 pr-4">{p.severity || '—'}</td>
                      <td className="py-2 pr-4">{p.time_to_triage_minutes}m</td>
                      <td className="py-2 pr-4">{p.time_to_disposition_minutes}m</td>
                      <td className="py-2 pr-4">{p.time_to_notify_minutes}m</td>
                      <td className="py-2 pr-4">{p.time_to_close_minutes}m</td>
                      <td className="py-2">{p.active ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'Sample Data' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle>Generate Demo Case</CardTitle>
            <p className="mt-2 text-sm text-muted">Create a sample case for analyst workflow testing.</p>
            <div className="mt-4 space-y-3">
              <Select value={sampleClientId} onChange={(e) => setSampleClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input placeholder="Optional case title" value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)} />
              <Button onClick={generateDemoCase} disabled={!sampleClientId}>Generate Demo Case</Button>
            </div>
          </Card>
          <Card>
            <CardTitle>Import Sample Alerts</CardTitle>
            <p className="mt-2 text-sm text-muted">Import a CSV of sample alerts into the case queue. Client names in the CSV must match existing clients.</p>
            <Button className="mt-4" variant="secondary" onClick={importSampleCsv}>Import Sample CSV</Button>
            <p className="mt-3 text-xs text-muted">Uses bundled sample with Apex Energy alert row (if client exists).</p>
          </Card>
          <Card className="md:col-span-2">
            <CardTitle>Integration Reference</CardTitle>
            <p className="mt-2 text-sm text-muted">
              Map each managed client to a <code className="text-primary">client_id</code> in Sentinel or webhook payloads.
              Copy IDs from the Clients tab.
            </p>
            <Link href="/app/cases" className="mt-3 inline-block text-sm text-primary hover:underline">Open Case Queue →</Link>
          </Card>
        </div>
      )}
    </div>
  );
}
