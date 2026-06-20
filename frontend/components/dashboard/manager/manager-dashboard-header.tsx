'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, BarChart3, FileText, FolderOpen, Plug, RefreshCw, ScrollText, Shield,
} from 'lucide-react';

export function ManagerDashboardHeader({
  hasSlaIssues,
  slaAtRisk,
  slaBreached,
  openCases,
  onRefresh,
  refreshing,
}: {
  hasSlaIssues: boolean;
  slaAtRisk: number;
  slaBreached: number;
  openCases: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">SOC Operations</p>
          </div>
          <h1 className="mt-3 text-2xl font-bold">Manager Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Operational command center for queue health, SLA governance, analyst workload, and AI decision quality.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              hasSlaIssues
                ? 'border-yellow-900/40 bg-yellow-950/25 text-yellow-200'
                : 'border-green-900/40 bg-green-950/20 text-green-300',
            )}>
              {hasSlaIssues ? <AlertTriangle className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
              {hasSlaIssues ? 'SLA attention needed' : 'Operations healthy'}
            </span>
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
              {openCases} open case{openCases === 1 ? '' : 's'}
            </span>
            {slaBreached > 0 && (
              <span className="rounded-full border border-red-900/40 bg-red-950/20 px-2.5 py-1 text-xs text-red-300">
                {slaBreached} breached
              </span>
            )}
            {slaAtRisk > 0 && (
              <span className="rounded-full border border-yellow-900/35 bg-yellow-950/15 px-2.5 py-1 text-xs text-yellow-200">
                {slaAtRisk} at risk
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
          <Link href="/app/cases">
            <Button variant="secondary" size="sm">
              <FolderOpen className="mr-2 h-4 w-4" />
              Case Queue
            </Button>
          </Link>
          <Link href="/app/cases?sla_at_risk=true">
            <Button variant="secondary" size="sm">
              <AlertTriangle className="mr-2 h-4 w-4" />
              SLA At Risk
            </Button>
          </Link>
          <Link href="/app/trust-metrics">
            <Button variant="secondary" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trust Metrics
            </Button>
          </Link>
          <Link href="/app/integrations">
            <Button variant="secondary" size="sm">
              <Plug className="mr-2 h-4 w-4" />
              Integrations
            </Button>
          </Link>
          <Link href="/app/audit">
            <Button variant="secondary" size="sm">
              <ScrollText className="mr-2 h-4 w-4" />
              Audit Log
            </Button>
          </Link>
          <Link href="/app/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
