'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AdminSummary } from '@/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { Card, CardTitle } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Building2, KeyRound, ListChecks, RefreshCw, Shield, Users } from 'lucide-react';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AdminSummary>('/admin/summary')
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminShell title="Dashboard"><LoadingState message="Loading admin summary..." /></AdminShell>;
  if (error) return <AdminShell title="Dashboard"><ErrorState message={error} /></AdminShell>;
  if (!summary) return null;

  const cards = [
    { href: '/app/admin/clients', label: 'Clients', value: summary.client_count, icon: Building2 },
    { href: '/app/admin/users', label: 'Users', value: summary.user_count, icon: Users },
    { href: '/app/settings/sla', label: 'SLA Policies', value: summary.sla_policy_count, icon: Shield },
    { href: '/app/admin/integration-keys', label: 'Integration Keys', value: summary.integration_key_count, icon: KeyRound },
    { href: '/app/admin/pilot-checklist', label: 'Pilot Checklist', value: `${summary.checklist?.setup_complete ? 'Ready' : 'In progress'}`, icon: ListChecks },
    { href: '/app/admin/demo-reset', label: 'Demo Data', value: summary.deployment_mode === 'local-demo' ? 'Reset available' : 'Protected', icon: RefreshCw },
  ];

  return (
    <AdminShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{c.label}</CardTitle>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{c.value}</p>
                </div>
                <c.icon className="h-5 w-5 text-muted" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Deployment Mode</CardTitle>
          <p className="mt-2 text-lg font-medium">{summary.deployment_mode}</p>
        </Card>
        <Card>
          <CardTitle>App Version</CardTitle>
          <p className="mt-2 text-lg font-medium">{summary.app_version}</p>
        </Card>
      </div>
    </AdminShell>
  );
}
