'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/states';
import { ManagerChartPanel } from '@/components/dashboard/manager/manager-chart-panel';

const PRIORITY_ORDER = ['P1 Critical', 'P2 High', 'P3 Medium', 'P4 Low', 'Unset'] as const;

const PRIORITY_META: Record<string, {
  short: string;
  color: string;
  glow: string;
  chip: string;
  gradientFrom: string;
  gradientTo: string;
}> = {
  'P1 Critical': {
    short: 'P1',
    color: '#ef4444',
    glow: 'shadow-red-500/20',
    chip: 'border-red-900/50 bg-red-950/30 text-red-300',
    gradientFrom: '#f87171',
    gradientTo: '#b91c1c',
  },
  'P2 High': {
    short: 'P2',
    color: '#f59e0b',
    glow: 'shadow-amber-500/20',
    chip: 'border-amber-900/50 bg-amber-950/25 text-amber-200',
    gradientFrom: '#fbbf24',
    gradientTo: '#d97706',
  },
  'P3 Medium': {
    short: 'P3',
    color: '#1d9bf0',
    glow: 'shadow-sky-500/20',
    chip: 'border-primary/35 bg-primary/10 text-primary',
    gradientFrom: '#38bdf8',
    gradientTo: '#0284c7',
  },
  'P4 Low': {
    short: 'P4',
    color: '#10b981',
    glow: 'shadow-emerald-500/20',
    chip: 'border-green-900/45 bg-green-950/20 text-green-300',
    gradientFrom: '#34d399',
    gradientTo: '#059669',
  },
  Unset: {
    short: '—',
    color: '#71767b',
    glow: 'shadow-muted/10',
    chip: 'border-border bg-background/60 text-muted',
    gradientFrom: '#9ca3af',
    gradientTo: '#4b5563',
  },
};

export type PriorityChartDatum = {
  name: string;
  value: number;
  fill?: string;
};

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function sortPriorityData(data: PriorityChartDatum[]) {
  const byName = new Map(data.map((d) => [d.name, d]));
  return PRIORITY_ORDER
    .map((name) => byName.get(name))
    .filter((d): d is PriorityChartDatum => d != null && d.value > 0);
}

function enrichDatum(datum: PriorityChartDatum) {
  const meta = PRIORITY_META[datum.name] || PRIORITY_META.Unset;
  return {
    ...datum,
    shortLabel: meta.short,
    fill: meta.color,
    meta,
    queryPriority: datum.name === 'Unset' ? '' : datum.name,
  };
}

function PriorityTooltip({ active, payload }: TooltipProps<number, string>) {
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
      </div>
    </div>
  );
}

function PriorityRow({
  datum,
  maxValue,
}: {
  datum: ReturnType<typeof enrichDatum> & { share: number };
  maxValue: number;
}) {
  const width = maxValue > 0 ? Math.max(8, (datum.value / maxValue) * 100) : 0;

  const row = (
    <>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium">{datum.name}</span>
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
    </>
  );

  if (!datum.queryPriority) {
    return <div className="rounded-lg px-2 py-1.5">{row}</div>;
  }

  return (
    <Link
      href={`/app/cases?priority=${encodeURIComponent(datum.queryPriority)}`}
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

function PriorityLegend({ data }: { data: ReturnType<typeof enrichDatum>[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {data.map((d) => {
        const content = (
          <span className={cn(
            'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            d.meta.chip,
            d.queryPriority && 'hover:brightness-110',
          )}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.meta.color }} />
            {d.name}
            <span className="tabular-nums text-muted">{d.value}</span>
          </span>
        );

        if (!d.queryPriority) return <span key={d.name}>{content}</span>;

        return (
          <Link key={d.name} href={`/app/cases?priority=${encodeURIComponent(d.queryPriority)}`}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function CasesByPriorityChart({ data }: { data: PriorityChartDatum[] }) {
  const chartData = useMemo(() => {
    const sorted = sortPriorityData(data).map(enrichDatum);
    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    return sorted.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);
  const p1Count = chartData.find((d) => d.name === 'P1 Critical')?.value ?? 0;
  const topBucket = [...chartData].sort((a, b) => b.value - a.value)[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const yMax = Math.max(maxValue + 1, Math.ceil(maxValue * 1.2));

  return (
    <ManagerChartPanel
      title="Cases by Priority"
      subtitle="Open and closed cases across the organization"
      icon={BarChart3}
      action={(
        <Link href="/app/cases" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Case queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    >
      {chartData.length === 0 ? (
        <EmptyState title="No cases" description="Cases will appear here once ingested or created." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Total cases</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{total}</div>
            </div>
            <div className={cn(
              'rounded-lg border px-3 py-2.5',
              p1Count > 0
                ? 'border-red-900/40 bg-red-950/15'
                : 'border-border bg-background/40',
            )}>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">P1 critical</div>
              <div className={cn('mt-1 text-xl font-bold tabular-nums', p1Count > 0 && 'text-red-300')}>
                {p1Count}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Largest bucket</div>
              <div className="mt-1 truncate text-sm font-semibold">{topBucket?.name ?? '—'}</div>
              <div className="text-xs text-muted tabular-nums">{topBucket ? `${topBucket.share}% of total` : '—'}</div>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
              <span>Priority mix</span>
              <span className="tabular-nums">{total} cases</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-border/80">
              {chartData.map((d) => (
                <div
                  key={d.name}
                  className="h-full transition-[width] duration-300"
                  style={{
                    width: `${d.share}%`,
                    backgroundColor: d.meta.color,
                    minWidth: d.value > 0 ? '4px' : 0,
                  }}
                  title={`${d.name}: ${d.value} (${d.share}%)`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3 sm:p-4 lg:col-span-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <defs>
                    {chartData.map((d) => {
                      const id = `priority-gradient-${slugify(d.name)}`;
                      return (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: '#2f3336' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, yMax]}
                    tick={{ fill: '#71767b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<PriorityTooltip />} cursor={{ fill: 'rgba(29, 155, 240, 0.06)' }} />
                  <Bar
                    dataKey="value"
                    name="Cases"
                    radius={[6, 6, 0, 0]}
                    barSize={36}
                    maxBarSize={42}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={`url(#priority-gradient-${slugify(entry.name)})`}
                        className={cn('drop-shadow-sm', entry.meta.glow)}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="top"
                      className="fill-foreground text-xs font-semibold"
                      formatter={(value: number) => (value > 0 ? value : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By priority</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                  <CheckCircle2 className="h-3 w-3" />
                  Click to filter
                </span>
              </div>
              <div className="space-y-0.5">
                {[...chartData]
                  .sort((a, b) => b.value - a.value)
                  .map((d) => (
                    <PriorityRow key={d.name} datum={d} maxValue={maxValue} />
                  ))}
              </div>
            </div>
          </div>

          <PriorityLegend data={chartData} />
        </>
      )}
    </ManagerChartPanel>
  );
}
