'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { AiActionBadge, SeverityBadge } from '@/components/ui/badges';
import type { TrustMetricsDrilldown } from '@/types';
import { ArrowRight, Search, X } from 'lucide-react';

export function TrustMetricsDrilldownPanel({
  drilldown,
  loading,
  onClose,
}: {
  drilldown: TrustMetricsDrilldown | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!drilldown && !loading) return null;

  return (
    <Card className="mt-6 overflow-hidden border-primary/30">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Metric Drilldown</h3>
            <p className="mt-0.5 text-xs text-muted">
              Cases driving this metric · {drilldown ? `${drilldown.total} total` : 'Loading…'}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="mr-1 h-3.5 w-3.5" />
          Close
        </Button>
      </div>

      {loading ? (
        <LoadingState message="Loading cases..." />
      ) : drilldown && drilldown.items.length === 0 ? (
        <EmptyState title="No matching cases" description="No cases match this drilldown in the selected range." />
      ) : drilldown ? (
        <ul className="mt-4 space-y-2">
          {drilldown.items.map((row) => (
            <li key={row.case_id}>
              <Link
                href={`/app/cases/${row.case_id}`}
                className="group block rounded-lg border border-border bg-background/50 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-primary">{row.case_number}</span>
                      <SeverityBadge severity={row.severity} />
                      <AiActionBadge action={row.ai_action} />
                    </div>
                    <div className="mt-1 truncate text-sm font-medium group-hover:text-primary">{row.title}</div>
                    <div className="mt-1 text-xs text-muted">{row.client_name}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted group-hover:text-primary" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted">
                  <span>AI conf: <strong className="text-foreground">{row.ai_confidence ?? '—'}</strong></span>
                  <span>Analyst conf: <strong className="text-foreground">{row.analyst_confidence}</strong></span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
