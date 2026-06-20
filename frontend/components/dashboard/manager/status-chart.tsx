'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import {
  ArrowRight, CheckCircle2, Layers, PieChart as PieChartIcon, Workflow,
} from 'lucide-react';
import { cn, STATUSES } from '@/lib/utils';
import { EmptyState } from '@/components/ui/states';
import { ManagerChartPanel } from '@/components/dashboard/manager/manager-chart-panel';

const STATUS_META: Record<string, {
  color: string;
  chip: string;
  phase: 'active' | 'terminal';
  short: string;
}> = {
  New: {
    color: '#1d9bf0',
    chip: 'border-primary/35 bg-primary/10 text-primary',
    phase: 'active',
    short: 'New',
  },
  Triaged: {
    color: '#38bdf8',
    chip: 'border-sky-900/40 bg-sky-950/20 text-sky-200',
    phase: 'active',
    short: 'Triaged',
  },
  Investigating: {
    color: '#8b5cf6',
    chip: 'border-violet-900/40 bg-violet-950/20 text-violet-200',
    phase: 'active',
    short: 'Invest.',
  },
  'Pending Client': {
    color: '#f59e0b',
    chip: 'border-amber-900/45 bg-amber-950/20 text-amber-200',
    phase: 'active',
    short: 'Pending',
  },
  Escalated: {
    color: '#ef4444',
    chip: 'border-red-900/45 bg-red-950/25 text-red-300',
    phase: 'active',
    short: 'Escal.',
  },
  Contained: {
    color: '#f97316',
    chip: 'border-orange-900/45 bg-orange-950/20 text-orange-200',
    phase: 'active',
    short: 'Contain.',
  },
  Resolved: {
    color: '#10b981',
    chip: 'border-green-900/45 bg-green-950/20 text-green-300',
    phase: 'terminal',
    short: 'Resolved',
  },
  Closed: {
    color: '#6b7280',
    chip: 'border-border bg-background/60 text-muted',
    phase: 'terminal',
    short: 'Closed',
  },
  'False Positive': {
    color: '#71767b',
    chip: 'border-border bg-background/50 text-muted',
    phase: 'terminal',
    short: 'FP',
  },
  Duplicate: {
    color: '#52525b',
    chip: 'border-border bg-background/50 text-muted',
    phase: 'terminal',
    short: 'Dup',
  },
};

export type StatusChartDatum = {
  name: string;
  value: number;
};

function sortStatusData(data: StatusChartDatum[]) {
  const byName = new Map(data.map((d) => [d.name, d]));
  return STATUSES
    .map((name) => byName.get(name))
    .filter((d): d is StatusChartDatum => d != null && d.value > 0);
}

function enrichDatum(datum: StatusChartDatum) {
  const meta = STATUS_META[datum.name] || {
    color: '#71767b',
    chip: 'border-border bg-background/60 text-muted',
    phase: 'active' as const,
    short: datum.name.slice(0, 8),
  };
  return {
    ...datum,
    meta,
    fill: meta.color,
    queryStatus: datum.name,
  };
}

function StatusTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichDatum> & { share: number };
  const { meta, name, value, share } = row;

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Cases</span>
        <span className="text-right font-semibold tabular-nums">{value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{share}%</span>
        <span className="text-muted">Phase</span>
        <span className="text-right capitalize">{meta.phase}</span>
      </div>
    </div>
  );
}

function StatusRow({
  datum,
  maxValue,
}: {
  datum: ReturnType<typeof enrichDatum> & { share: number };
  maxValue: number;
}) {
  const width = maxValue > 0 ? Math.max(6, (datum.value / maxValue) * 100) : 0;

  return (
    <Link
      href={`/app/cases?status=${encodeURIComponent(datum.queryStatus)}`}
      className="group block rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-background/40"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium group-hover:text-primary">{datum.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {datum.value}
          <span className="ml-1 text-[10px]">({datum.share}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${width}%`, backgroundColor: datum.meta.color }}
        />
      </div>
    </Link>
  );
}

export function CasesByStatusChart({ data }: { data: StatusChartDatum[] }) {
  const chartData = useMemo(() => {
    const sorted = sortStatusData(data).map(enrichDatum);
    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    return sorted.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);
  const activeCount = useMemo(
    () => chartData.filter((d) => d.meta.phase === 'active').reduce((sum, d) => sum + d.value, 0),
    [chartData],
  );
  const terminalCount = total - activeCount;
  const activeShare = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const topBucket = [...chartData].sort((a, b) => b.value - a.value)[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <ManagerChartPanel
      title="Cases by Status"
      subtitle="Lifecycle distribution across the queue"
      icon={PieChartIcon}
      action={(
        <Link href="/app/cases" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Case queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    >
      {chartData.length === 0 ? (
        <EmptyState title="No status data" description="No cases in the queue yet." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">In workflow</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-primary">{activeCount}</div>
              <div className="text-[11px] text-muted">{activeShare}% active</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Terminal</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{terminalCount}</div>
              <div className="text-[11px] text-muted">{100 - activeShare}% closed out</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Workflow className="h-3 w-3" />
                Lifecycle mix
              </span>
              <span className="tabular-nums">{total} total</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-border/80">
              {activeCount > 0 && (
                <div
                  className="h-full bg-primary/80"
                  style={{ width: `${activeShare}%`, minWidth: '4px' }}
                  title={`Active: ${activeCount}`}
                />
              )}
              {terminalCount > 0 && (
                <div
                  className="h-full bg-muted/60"
                  style={{ width: `${100 - activeShare}%`, minWidth: '4px' }}
                  title={`Terminal: ${terminalCount}`}
                />
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                Active workflow
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted/60" />
                Terminal
              </span>
            </div>
          </div>

          <div className="relative rounded-lg border border-border/70 bg-background/30 p-3">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="#0f1419"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} className="drop-shadow-sm" />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums">{total}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted">cases</div>
                {topBucket && (
                  <div className="mt-1 max-w-[88px] truncate text-[10px] text-muted">
                    Top: {topBucket.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By status</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                <CheckCircle2 className="h-3 w-3" />
                Click to filter
              </span>
            </div>
            <div className="max-h-[220px] space-y-0.5 overflow-y-auto pr-1">
              {[...chartData]
                .sort((a, b) => b.value - a.value)
                .map((d) => (
                  <StatusRow key={d.name} datum={d} maxValue={maxValue} />
                ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {chartData.map((d) => (
              <Link
                key={d.name}
                href={`/app/cases?status=${encodeURIComponent(d.queryStatus)}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:brightness-110',
                  d.meta.chip,
                )}
              >
                <Layers className="h-3 w-3 opacity-70" />
                {d.meta.short}
                <span className="tabular-nums opacity-80">{d.value}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </ManagerChartPanel>
  );
}
