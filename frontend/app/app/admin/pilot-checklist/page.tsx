'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PilotChecklist } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card, Badge } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function StatusIcon({ status }: { status: string }) {
  if (status === 'Complete') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
  if (status === 'Needs attention') return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  return <Circle className="h-4 w-4 text-muted" />;
}

export default function PilotChecklistPage() {
  const [data, setData] = useState<PilotChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<PilotChecklist>('/admin/pilot-checklist')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminShell title="Pilot Checklist"><LoadingState message="Loading checklist..." /></AdminShell>;
  if (error) return <AdminShell title="Pilot Checklist"><ErrorState message={error} /></AdminShell>;
  if (!data) return null;

  return (
    <AdminShell title="Pilot Checklist">
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Progress</p>
            <p className="text-2xl font-bold">{data.complete_count} / {data.total_count}</p>
          </div>
          <Badge>{data.ready_for_pilot ? 'Ready for pilot' : 'Setup in progress'}</Badge>
        </div>
      </Card>
      <ul className="space-y-2">
        {data.items.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              item.status === 'Complete' ? 'border-green-900/30 bg-green-900/10' : 'border-border',
            )}
          >
            <StatusIcon status={item.status} />
            <div className="flex-1">
              <p className="text-sm font-medium">{item.label}</p>
            </div>
            <span className="text-xs text-muted">{item.status}</span>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
