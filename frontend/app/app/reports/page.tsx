'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, hasRole, MANAGER_ROLES } from '@/hooks/useAuth';
import type { Report, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/ui/states';

import { Plus } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isManager = hasRole(user, MANAGER_ROLES);

  useEffect(() => {
    api<Report[]>('/reports')
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monthly Reports</h1>
        {isManager && (
          <Link href="/app/reports/new">
            <Button><Plus className="mr-2 h-4 w-4" /> New Report</Button>
          </Link>
        )}
      </div>
      {loading ? (
        <LoadingState message="Loading reports..." />
      ) : (
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="cursor-pointer rounded-xl border border-border bg-card p-4 hover:border-primary/50" onClick={() => router.push(`/app/reports/${r.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{r.title}</CardTitle>
                <div className="mt-1 text-sm text-muted">
                  {r.reporting_period_start} to {r.reporting_period_end} · {r.status}
                </div>
              </div>
              {r.published_at && <span className="text-xs text-green-400">Published {new Date(r.published_at).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        {reports.length === 0 && <EmptyState title="No reports yet" description={isManager ? 'Generate a monthly report for a client.' : 'Published reports will appear here.'} />}
      </div>
      )}
    </div>
  );
}
