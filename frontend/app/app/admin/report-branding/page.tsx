'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Client, ReportBranding } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';

const DEFAULT_BRANDING: Partial<ReportBranding> = {
  provider_name: '',
  provider_logo_url: '',
  client_logo_url: '',
  report_title: 'SOC Monthly Value Report',
  prepared_by: '',
  prepared_for: '',
  confidentiality_footer: 'Confidential — for authorized recipients only.',
  cover_page_enabled: true,
  theme_name: 'default',
};

export default function ReportBrandingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [scope, setScope] = useState<'org' | 'client'>('org');
  const [form, setForm] = useState<Partial<ReportBranding>>(DEFAULT_BRANDING);
  const [preview, setPreview] = useState<ReportBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const loadPreview = useCallback(async (cid?: string) => {
    if (scope === 'client' && cid) {
      const b = await api<ReportBranding>(`/report-branding/clients/${cid}`);
      setPreview(b);
      setForm({ ...DEFAULT_BRANDING, ...b });
    } else {
      const list = await api<ReportBranding[]>('/report-branding');
      const org = list.find((b) => !b.client_id) || null;
      setPreview(org);
      if (org) setForm({ ...DEFAULT_BRANDING, ...org });
      else setForm(DEFAULT_BRANDING);
    }
  }, [scope]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const c = await api<Client[]>('/clients');
        setClients(c);
        const first = c[0]?.id || '';
        setClientId(first);
        await loadPreview(first);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) loadPreview(clientId).catch(() => {});
  }, [scope, clientId, loading, loadPreview]);

  const save = async () => {
    setSaved(false);
    try {
      const path = scope === 'client' && clientId
        ? `/report-branding/clients/${clientId}`
        : '/report-branding';
      await api(path, { method: 'POST', body: JSON.stringify(form) });
      setSaved(true);
      await loadPreview(clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  if (loading) return <AdminShell title="Report Branding"><LoadingState message="Loading..." /></AdminShell>;

  return (
    <AdminShell title="Report Branding">
      {error && <ErrorState message={error} />}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex gap-3">
            <Select value={scope} onChange={(e) => setScope(e.target.value as 'org' | 'client')}>
              <option value="org">Organization default</option>
              <option value="client">Client-specific</option>
            </Select>
            {scope === 'client' && (
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </div>
          <div className="space-y-3">
            {[
              ['provider_name', 'Provider Name'],
              ['provider_logo_url', 'Provider Logo URL'],
              ['client_logo_url', 'Client Logo URL'],
              ['report_title', 'Report Title'],
              ['prepared_by', 'Prepared By'],
              ['prepared_for', 'Prepared For'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-muted">{label}</label>
                <Input
                  value={(form as Record<string, string>)[key] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs text-muted">Confidentiality Footer</label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                rows={2}
                value={form.confidentiality_footer || ''}
                onChange={(e) => setForm({ ...form, confidentiality_footer: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.cover_page_enabled ?? true}
                onChange={(e) => setForm({ ...form, cover_page_enabled: e.target.checked })}
              />
              Enable cover page
            </label>
            <Button onClick={save}>Save Branding</Button>
            {saved && <p className="text-sm text-green-400">Branding saved.</p>}
          </div>
        </Card>
        <Card>
          <h3 className="mb-4 text-sm font-medium">Preview</h3>
          {form.cover_page_enabled && (
            <div className="rounded-lg border border-border bg-white p-6 text-black">
              {form.provider_logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.provider_logo_url} alt="" className="mb-4 h-10 object-contain" />
              )}
              <p className="text-xs uppercase tracking-widest text-gray-500">{form.provider_name || 'Your SOC Provider'}</p>
              <h2 className="mt-2 text-2xl font-bold">{form.report_title}</h2>
              {form.prepared_for && <p className="mt-2 text-sm text-gray-600">Prepared for: {form.prepared_for}</p>}
              {form.prepared_by && <p className="text-sm text-gray-600">Prepared by: {form.prepared_by}</p>}
              <p className="mt-6 text-xs text-gray-500">{form.confidentiality_footer}</p>
            </div>
          )}
          {!form.cover_page_enabled && <p className="text-sm text-muted">Cover page disabled.</p>}
        </Card>
      </div>
    </AdminShell>
  );
}
