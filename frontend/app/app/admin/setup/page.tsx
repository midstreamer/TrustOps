'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';
import { useAuth, hasRole, ADMIN_SETUP_ROLES } from '@/hooks/useAuth';
import type { AdminOverview, Client, IntegrationEvent, SLAPolicy, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { KpiCard, SectionHeader } from '@/components/dashboard/kpi-card';
import { cn } from '@/lib/utils';
import {
  Building2, CheckCircle2, Circle, Copy, ExternalLink, FileUp, FolderOpen,
  LayoutDashboard, Plug, RefreshCw, Shield, Users, AlertTriangle,
} from 'lucide-react';

const TABS = [
  { id: 'Overview', icon: LayoutDashboard },
  { id: 'Clients', icon: Building2 },
  { id: 'Integrations', icon: Plug },
  { id: 'Users', icon: Users },
  { id: 'SLA Policies', icon: Shield },
  { id: 'Sample Data', icon: FileUp },
] as const;
type Tab = (typeof TABS)[number]['id'];

const PROVIDER_ROLES = ['Platform Admin', 'SOC Manager', 'SOC Analyst'];
const CLIENT_ROLES = ['Client Admin', 'Client Viewer'];
const SERVICE_TIERS = ['Premium', 'Standard', 'Basic'];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SAMPLE_CSV = `client_name,title,severity,priority,source_system,description,asset_name,username
Apex Energy,Suspicious login from new country,High,P2 High,Microsoft Entra ID,Multiple failed logins,VPN-GW-01,jsmith`;

const CHECKLIST_ITEMS = [
  { key: 'has_clients', label: 'At least one managed client', tab: 'Clients' as Tab },
  { key: 'all_clients_have_sla', label: 'All clients have SLA policies', tab: 'SLA Policies' as Tab },
  { key: 'has_soc_users', label: 'SOC team users configured', tab: 'Users' as Tab },
  { key: 'all_clients_have_portal_users', label: 'Each client has a portal user', tab: 'Users' as Tab },
  { key: 'has_cases', label: 'At least one case in the queue', tab: 'Sample Data' as Tab },
] as const;

function CheckItem({ done, label, onGo }: { done: boolean; label: string; onGo?: () => void }) {
  return (
    <button
      type="button"
      onClick={onGo}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
        done ? 'border-green-900/30 bg-green-900/10' : 'border-border bg-background/40 hover:border-primary/30 hover:bg-primary/5',
      )}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-muted" />
      )}
      <span className={done ? 'text-foreground' : 'text-muted'}>{label}</span>
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      {children}
    </div>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function tierVariant(tier: string | null) {
  if (tier === 'Premium') return 'high';
  if (tier === 'Standard') return 'medium';
  if (tier === 'Basic') return 'low';
  return 'default';
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
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationEvent[]>([]);
  const [logClientFilter, setLogClientFilter] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const visibleTabs = TABS.filter((t) => t.id !== 'Users' || isPlatformAdmin);

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

  const loadIntegrationLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logClientFilter) params.set('client_id', logClientFilter);
      if (logStatusFilter) params.set('status', logStatusFilter);
      params.set('limit', '50');
      const qs = params.toString();
      const logs = await api<IntegrationEvent[]>(`/integrations/logs${qs ? `?${qs}` : ''}`);
      setIntegrationLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [logClientFilter, logStatusFilter]);

  useEffect(() => {
    if (tab === 'Integrations') loadIntegrationLogs();
  }, [tab, loadIntegrationLogs]);

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

  const checklistDone = overview
    ? CHECKLIST_ITEMS.filter((item) => overview.checklist[item.key]).length
    : 0;
  const checklistTotal = CHECKLIST_ITEMS.length;
  const checklistPct = Math.round((checklistDone / checklistTotal) * 100);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Setup</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Onboard managed clients for your MDR service — organization, users, SLA, integrations, and sample cases.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/cases">
            <Button variant="secondary" size="sm">
              <FolderOpen className="mr-2 h-4 w-4" />
              Case Queue
            </Button>
          </Link>
          <Link href="/app/manager">
            <Button variant="secondary" size="sm">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manager Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-900/50 bg-green-900/20 px-4 py-3 text-sm text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {visibleTabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-primary/20 text-primary'
                : 'text-muted hover:bg-card hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {id}
          </button>
        ))}
      </div>

      {tab === 'Overview' && overview && (
        <div className="space-y-6">
          <SectionHeader title="Organization" description={overview.organization_name} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Managed Clients" value={overview.client_count} sub="Active tenants" icon={Building2} tone="primary" />
            <KpiCard label="Users" value={overview.user_count} sub="Provider + portal" icon={Users} />
            <KpiCard label="SLA Policies" value={overview.sla_policy_count} sub="Across all clients" icon={Shield} />
            <KpiCard label="Cases" value={overview.case_count} sub="In the queue" icon={FolderOpen} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cn(
              overview.checklist.setup_complete
                ? 'border-green-900/40 bg-green-900/10'
                : 'border-primary/30 bg-primary/5',
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle>Pilot Setup Checklist</CardTitle>
                  <p className="mt-1 text-xs text-muted">
                    {checklistDone} of {checklistTotal} complete ({checklistPct}%)
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        overview.checklist.setup_complete ? 'bg-green-500' : 'bg-primary',
                      )}
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>
                </div>
                <div className={cn(
                  'text-3xl font-bold tabular-nums',
                  overview.checklist.setup_complete ? 'text-green-400' : 'text-primary',
                )}>
                  {checklistPct}%
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <CheckItem
                    key={item.key}
                    done={overview.checklist[item.key]}
                    label={item.label}
                    onGo={() => !overview.checklist[item.key] && setTab(item.tab)}
                  />
                ))}
              </div>
              {overview.checklist.setup_complete ? (
                <p className="mt-4 text-sm font-medium text-green-400">Setup complete — ready for pilot operations.</p>
              ) : (
                <p className="mt-4 text-sm text-muted">Click incomplete items to jump to the relevant tab.</p>
              )}
            </Card>

            <Card>
              <CardTitle>Quick Actions</CardTitle>
              <p className="mt-1 text-xs text-muted">Common onboarding tasks</p>
              <div className="mt-4 grid gap-2">
                {[
                  { label: 'Add managed client', tab: 'Clients' as Tab },
                  { label: 'Configure integrations', tab: 'Integrations' as Tab },
                  { label: 'Apply SLA templates', tab: 'SLA Policies' as Tab },
                  { label: 'Generate demo case', tab: 'Sample Data' as Tab },
                ].map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => setTab(action.tab)}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span>{action.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {(overview.clients_without_sla.length > 0 || overview.clients_without_portal_users.length > 0) && (
            <SectionHeader title="Attention Needed" description="Resolve these before going live with a pilot" />
          )}
          {overview.clients_without_sla.length > 0 && (
            <Card className="border-yellow-900/40 bg-yellow-900/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                <div className="flex-1">
                  <CardTitle>Clients Missing SLA</CardTitle>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {overview.clients_without_sla.map((c) => (
                      <Badge key={c.id} variant="warning">{c.name}</Badge>
                    ))}
                  </ul>
                  <Button className="mt-3" size="sm" variant="secondary" onClick={() => setTab('SLA Policies')}>
                    Apply SLA Templates
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {overview.clients_without_portal_users.length > 0 && (
            <Card className="border-yellow-900/40 bg-yellow-900/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-300" />
                <div className="flex-1">
                  <CardTitle>Clients Missing Portal Users</CardTitle>
                  <p className="mt-1 text-xs text-muted">Add a Client Admin or Client Viewer for each managed client.</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {overview.clients_without_portal_users.map((c) => (
                      <Badge key={c.id} variant="warning">{c.name}</Badge>
                    ))}
                  </ul>
                  {isPlatformAdmin && (
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => setTab('Users')}>
                      Add Portal Users
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'Clients' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Add Managed Client</CardTitle>
            <p className="mt-1 text-xs text-muted">Creates client with optional default Critical/High SLA policies</p>
            <form onSubmit={createClient} className="mt-4 space-y-3">
              <FormField label="Client name *">
                <Input value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} required />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Industry">
                  <Input value={clientForm.industry} onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })} />
                </FormField>
                <FormField label="Service tier">
                  <Select value={clientForm.service_tier} onChange={(e) => setClientForm({ ...clientForm, service_tier: e.target.value })}>
                    {SERVICE_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label="Timezone">
                <Input value={clientForm.timezone} onChange={(e) => setClientForm({ ...clientForm, timezone: e.target.value })} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Primary contact name">
                  <Input value={clientForm.primary_contact_name} onChange={(e) => setClientForm({ ...clientForm, primary_contact_name: e.target.value })} />
                </FormField>
                <FormField label="Primary contact email">
                  <Input type="email" value={clientForm.primary_contact_email} onChange={(e) => setClientForm({ ...clientForm, primary_contact_email: e.target.value })} />
                </FormField>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
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
                  <div
                    key={c.id}
                    className="rounded-lg border border-border bg-background/40 p-3 text-sm transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{c.name}</div>
                      <Badge variant={tierVariant(c.service_tier)}>{c.service_tier || '—'}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted">{c.industry || 'No industry'}</div>
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-card px-2 py-1.5">
                      <code className="flex-1 truncate text-xs text-primary">{c.id}</code>
                      <button
                        type="button"
                        onClick={() => copyClientId(c.id)}
                        className="rounded p-1 text-muted hover:bg-border hover:text-foreground"
                        title="Copy client ID for integrations"
                      >
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

      {tab === 'Integrations' && (
        <div className="space-y-6">
          <SectionHeader
            title="Client ID Mapping"
            description="Use each UUID as client_id in Sentinel Logic Apps or webhook payloads"
          />
          <Card>
            {clients.length === 0 ? (
              <EmptyState title="No clients" description="Add managed clients first." />
            ) : (
              <DataTable>
                <thead className="bg-card">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    {['Client', 'client_id', 'Endpoint', ''].map((h) => (
                      <th key={h || 'actions'} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-card/50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-primary">{c.id}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {API_BASE}/integrations/sentinel/alerts
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" onClick={() => copyClientId(c.id)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
            <p className="mt-4 text-xs text-muted">
              Template: <code>samples/sentinel-logic-app-workflow.json</code> · Docs: <code>docs/integrations/sentinel.md</code>
            </p>
          </Card>

          <SectionHeader title="Integration Event Log" description="Recent webhook and Sentinel ingestion attempts" />
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Client">
                <Select value={logClientFilter} onChange={(e) => setLogClientFilter(e.target.value)} className="min-w-[160px]">
                  <option value="">All clients</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Status">
                <Select value={logStatusFilter} onChange={(e) => setLogStatusFilter(e.target.value)} className="min-w-[140px]">
                  <option value="">All statuses</option>
                  {['success', 'duplicate', 'error'].map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
              <Button variant="secondary" onClick={loadIntegrationLogs} disabled={logsLoading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', logsLoading && 'animate-spin')} />
                {logsLoading ? 'Loading…' : 'Refresh'}
              </Button>
            </div>
            {integrationLogs.length === 0 ? (
              <EmptyState title="No integration events" description="Events appear when alerts are ingested via webhook or Sentinel." />
            ) : (
              <DataTable>
                <thead className="bg-card">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    {['Time', 'Source', 'Status', 'Event', 'Client', 'Case', 'Error'].map((h) => (
                      <th key={h} className="px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {integrationLogs.map((ev) => (
                    <tr key={ev.id} className="border-t border-border hover:bg-card/30">
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted">
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{ev.integration_source}</td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            ev.status === 'success' ? 'success'
                              : ev.status === 'duplicate' ? 'warning'
                                : 'danger'
                          }
                        >
                          {ev.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{ev.event_type}</td>
                      <td className="px-3 py-2.5 text-xs text-muted">
                        {clients.find((c) => c.id === ev.client_id)?.name || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {ev.case_number ? (
                          <Link href={`/app/cases/${ev.case_id}`} className="text-xs text-primary hover:underline">
                            {ev.case_number}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-red-300" title={ev.error_message || undefined}>
                        {ev.error_message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Card>
        </div>
      )}

      {tab === 'Users' && isPlatformAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Add User</CardTitle>
            <p className="mt-1 text-xs text-muted">Provider roles for SOC staff; client roles for portal access</p>
            <form onSubmit={createUser} className="mt-4 space-y-3">
              <FormField label="Full name *">
                <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              </FormField>
              <FormField label="Email *">
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              </FormField>
              <FormField label="Temporary password">
                <Input value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              </FormField>
              <FormField label="Role">
                <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                  {[...PROVIDER_ROLES, ...CLIENT_ROLES].map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </FormField>
              {CLIENT_ROLES.includes(userForm.role) && (
                <FormField label="Client *">
                  <Select value={userForm.client_id} onChange={(e) => setUserForm({ ...userForm, client_id: e.target.value })} required>
                    <option value="">Select client</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </FormField>
              )}
              <Button type="submit">Create User</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Users ({users.length})</CardTitle>
            <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
              {users.length === 0 ? (
                <EmptyState title="No users" description="Create provider and portal users above." />
              ) : users.map((u) => (
                <div key={u.id} className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted">{u.email}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant={CLIENT_ROLES.includes(r) ? 'medium' : 'default'}>{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'SLA Policies' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Client">
                <Select value={slaClientId} onChange={(e) => setSlaClientId(e.target.value)} className="min-w-[200px]">
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <Button variant="secondary" onClick={applyDefaultSla}>Apply Default Templates</Button>
              <Link href="/app/settings/sla">
                <Button variant="secondary">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Advanced SLA Settings
                </Button>
              </Link>
            </div>
          </Card>
          <Card>
            <CardTitle>SLA Policies</CardTitle>
            {policies.length === 0 ? (
              <EmptyState title="No SLA policies" description="Apply default templates or use Advanced SLA Settings." />
            ) : (
              <DataTable>
                <thead className="bg-card">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    {['Severity', 'Triage', 'Disposition', 'Notify', 'Close', 'Active'].map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{p.severity || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.time_to_triage_minutes}m</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.time_to_disposition_minutes}m</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.time_to_notify_minutes}m</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.time_to_close_minutes}m</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={p.active ? 'success' : 'default'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
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
              <FormField label="Client">
                <Select value={sampleClientId} onChange={(e) => setSampleClientId(e.target.value)}>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Optional title">
                <Input value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)} placeholder="Custom case title" />
              </FormField>
              <Button onClick={generateDemoCase} disabled={!sampleClientId}>Generate Demo Case</Button>
            </div>
          </Card>
          <Card>
            <CardTitle>Import Sample Alerts</CardTitle>
            <p className="mt-2 text-sm text-muted">
              Import a CSV of sample alerts. Client names must match existing clients.
            </p>
            <Button className="mt-4" variant="secondary" onClick={importSampleCsv}>
              <FileUp className="mr-2 h-4 w-4" />
              Import Sample CSV
            </Button>
            <p className="mt-3 text-xs text-muted">Bundled sample includes an Apex Energy alert row.</p>
          </Card>
          <Card className="md:col-span-2 border-primary/20 bg-primary/5">
            <CardTitle>Next Steps</CardTitle>
            <p className="mt-2 text-sm text-muted">
              After onboarding clients, map <code className="text-primary">client_id</code> values in the Integrations tab
              and verify ingestion in the event log.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setTab('Integrations')}>Open Integrations</Button>
              <Link href="/app/cases">
                <Button size="sm" variant="secondary">Open Case Queue</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
