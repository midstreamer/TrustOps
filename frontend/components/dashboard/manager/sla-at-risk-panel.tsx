'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Layers, Users } from 'lucide-react';
import { PriorityBadge, SeverityBadge, SlaBadge } from '@/components/ui/badges';
import { QualityBadge } from '@/components/dashboard/quality-badge';
import { ManagerChartPanel } from '@/components/dashboard/manager/manager-chart-panel';
import type { Case } from '@/types';

export function SlaAtRiskPanel({ cases }: { cases: Case[] }) {
  return (
    <ManagerChartPanel
      title="SLA At Risk"
      subtitle="Cases needing manager attention"
      icon={AlertTriangle}
      action={(
        <Link href="/app/cases?sla_at_risk=true" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      )}
    >
      {cases.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-900/35 bg-green-950/10 px-3 py-3">
          <div className="rounded-full bg-green-950/40 p-1.5 text-green-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-200">All clear</p>
            <p className="text-xs text-green-200/70">No cases currently at SLA risk.</p>
          </div>
        </div>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/cases/${c.id}`}
                className="group block rounded-lg border border-border bg-background/50 p-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium group-hover:text-primary">{c.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                      <span>{c.case_number}</span>
                      <span>·</span>
                      <span>{c.client_name || 'Client'}</span>
                      {c.assigned_to_name && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {c.assigned_to_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <SlaBadge status={c.sla_status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={c.severity} />
                  {c.priority && <PriorityBadge priority={c.priority} />}
                  {c.quality && <QualityBadge quality={c.quality} compact />}
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-1.5 py-0.5 text-xs text-muted">
                    <Layers className="h-3 w-3" />
                    {c.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ManagerChartPanel>
  );
}
