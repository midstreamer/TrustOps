'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Brain, FileText, LayoutDashboard, RefreshCw, Scale,
} from 'lucide-react';

export function TrustMetricsHeader({
  score,
  decisionCount,
  agreementRate,
  acceptanceRate,
  onRefresh,
  refreshing,
}: {
  score: number;
  decisionCount: number;
  agreementRate: number;
  acceptanceRate: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const scoreTone = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'neutral';

  return (
    <div className="mb-6 rounded-xl border border-border bg-gradient-to-br from-purple-950/20 via-card to-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-purple-500/15 p-2 text-purple-300">
              <Scale className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Human–AI Quality</p>
          </div>
          <h1 className="mt-3 text-2xl font-bold">Trust Metrics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Human-AI decision quality analytics for pilot QBRs — measure alignment, overrides, and QA validation over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              scoreTone === 'good' && 'border-green-900/40 bg-green-950/20 text-green-300',
              scoreTone === 'warn' && 'border-yellow-900/40 bg-yellow-950/20 text-yellow-200',
              scoreTone === 'neutral' && 'border-primary/35 bg-primary/10 text-primary',
            )}>
              <Scale className="h-3 w-3" />
              Calibration {score}/100
            </span>
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
              {decisionCount} decision{decisionCount === 1 ? '' : 's'}
            </span>
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
              {agreementRate}% agreement
            </span>
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
              {acceptanceRate}% AI acceptance
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
          <Link href="/app/manager">
            <Button variant="secondary" size="sm">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manager Dashboard
            </Button>
          </Link>
          <Link href="/app/reports">
            <Button variant="secondary" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Client Reports
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
