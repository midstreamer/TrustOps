'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AdminSummary } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DemoResetPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<string>('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    api<AdminSummary>('/admin/summary')
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const reset = async () => {
    if (!confirm('Reset all demo cases and re-seed CASE-GOLDEN? This cannot be undone.')) return;
    setResetting(true);
    setError('');
    try {
      const r = await api<{ message: string; cases_deleted: number }>('/admin/demo-reset', { method: 'POST' });
      setResult(`Reset complete: ${r.cases_deleted} cases removed. ${r.message || ''}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const isLocalDemo = summary?.deployment_mode === 'local-demo';

  if (loading) return <AdminShell title="Demo Reset"><LoadingState message="Loading..." /></AdminShell>;

  return (
    <AdminShell title="Demo Reset">
      {error && <ErrorState message={error} />}
      <Card>
        {!isLocalDemo ? (
          <div className="flex items-start gap-3 text-sm text-yellow-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Demo reset is local-demo only</p>
              <p className="mt-1 text-muted">
                Current mode: <strong>{summary?.deployment_mode}</strong>. Destructive reset is disabled in pilot and production modes.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Reset demo data, re-seed CASE-GOLDEN, Apex report data, and demo users. Available only in local-demo mode.
            </p>
            <Button onClick={reset} disabled={resetting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {resetting ? 'Resetting...' : 'Reset Demo Data'}
            </Button>
            {result && <p className="text-sm text-green-400">{result}</p>}
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
