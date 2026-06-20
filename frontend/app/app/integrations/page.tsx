'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import type { IntegrationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Plug, RefreshCw, XCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  Healthy: 'text-green-400 bg-green-900/20 border-green-800/40',
  Warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/40',
  Error: 'text-red-400 bg-red-900/20 border-red-800/40',
  'Not Configured': 'text-muted bg-border/30 border-border',
  'No Recent Data': 'text-muted bg-border/20 border-border',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'Healthy') return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  if (status === 'Error') return <XCircle className="h-5 w-5 text-red-400" />;
  if (status === 'Warning') return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
  return <Activity className="h-5 w-5 text-muted" />;
}

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<IntegrationStatus[]>('/integrations/status');
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load integration status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Loading integration health..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="mt-1 text-sm text-muted">
            Monitor webhook and Microsoft Sentinel ingestion health for your SOC.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.integration_key} className="overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Plug className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>{item.integration_name}</CardTitle>
                  <p className="text-xs text-muted">{item.source_system}</p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                  STATUS_STYLES[item.status] || STATUS_STYLES['No Recent Data'],
                )}
              >
                <StatusIcon status={item.status} />
                {item.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Last alert</dt>
                <dd>{item.last_alert_received_at ? new Date(item.last_alert_received_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Alerts (24h)</dt>
                <dd className="font-medium">{item.alerts_received_last_24h}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Failed (24h)</dt>
                <dd className={item.failed_payloads_last_24h > 0 ? 'text-yellow-400' : ''}>
                  {item.failed_payloads_last_24h}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">API key</dt>
                <dd>{item.api_key_configured ? 'Configured' : 'Missing'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Client mapping</dt>
                <dd>{item.client_mapping_status}</dd>
              </div>
            </dl>
            {item.last_error && (
              <p className="mt-3 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-300">
                {item.last_error}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Troubleshooting</CardTitle>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted">
          <li>Verify <code className="text-foreground">X-TrustOps-Webhook-Key</code> matches your deployment secret.</li>
          <li>Ensure each Sentinel playbook includes the correct managed client UUID.</li>
          <li>Check Admin Setup → Integrations for recent ingestion event logs.</li>
          <li>Replayed alerts with the same <code className="text-foreground">source_alert_id</code> are deduplicated.</li>
        </ul>
        <Link
          href="https://github.com/midstreamer/TrustOps/blob/main/docs/integrations/sentinel.md"
          className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Sentinel integration docs
          <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}
