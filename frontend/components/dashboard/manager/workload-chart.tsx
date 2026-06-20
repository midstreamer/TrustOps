'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { AlertTriangle, ArrowRight, Scale, UserCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/states';
import { ManagerChartPanel } from '@/components/dashboard/manager/manager-chart-panel';

const ANALYST_PALETTE = [
  {
    color: '#10b981',
    gradientFrom: '#34d399',
    gradientTo: '#059669',
    chip: 'border-green-900/45 bg-green-950/20 text-green-300',
    avatar: 'bg-green-950/40 text-green-300',
  },
  {
    color: '#1d9bf0',
    gradientFrom: '#38bdf8',
    gradientTo: '#0284c7',
    chip: 'border-primary/35 bg-primary/10 text-primary',
    avatar: 'bg-primary/15 text-primary',
  },
  {
    color: '#8b5cf6',
    gradientFrom: '#a78bfa',
    gradientTo: '#7c3aed',
    chip: 'border-violet-900/40 bg-violet-950/20 text-violet-200',
    avatar: 'bg-violet-950/35 text-violet-200',
  },
  {
    color: '#f59e0b',
    gradientFrom: '#fbbf24',
    gradientTo: '#d97706',
    chip: 'border-amber-900/45 bg-amber-950/20 text-amber-200',
    avatar: 'bg-amber-950/30 text-amber-200',
  },
  {
    color: '#ef4444',
    gradientFrom: '#f87171',
    gradientTo: '#b91c1c',
    chip: 'border-red-900/45 bg-red-950/25 text-red-300',
    avatar: 'bg-red-950/30 text-red-300',
  },
  {
    color: '#ec4899',
    gradientFrom: '#f472b6',
    gradientTo: '#db2777',
    chip: 'border-pink-900/40 bg-pink-950/20 text-pink-200',
    avatar: 'bg-pink-950/30 text-pink-200',
  },
] as const;

export type WorkloadChartDatum = {
  name: string;
  value: number;
};

type LoadLevel = 'light' | 'moderate' | 'heavy';

function analystInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function loadLevel(value: number, average: number): LoadLevel {
  if (value > average * 1.25) return 'heavy';
  if (value > average * 0.75) return 'moderate';
  return 'light';
}

const LOAD_BADGE: Record<LoadLevel, string> = {
  light: 'border-green-900/40 bg-green-950/15 text-green-300',
  moderate: 'border-amber-900/40 bg-amber-950/15 text-amber-200',
  heavy: 'border-red-900/40 bg-red-950/20 text-red-300',
};

function enrichDatum(datum: WorkloadChartDatum, index: number, average: number) {
  const palette = ANALYST_PALETTE[index % ANALYST_PALETTE.length];
  return {
    ...datum,
    palette,
    fill: palette.color,
    load: loadLevel(datum.value, average),
    initials: analystInitials(datum.name),
  };
}

function WorkloadTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichDatum> & { share: number };
  const { name, value, share, load, palette } = row;

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold', palette.avatar)}
        >
          {row.initials}
        </span>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-[11px] capitalize text-muted">{load} load</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Open cases</span>
        <span className="text-right font-semibold tabular-nums">{value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{share}%</span>
      </div>
    </div>
  );
}

function AnalystRow({
  datum,
  maxValue,
}: {
  datum: ReturnType<typeof enrichDatum> & { share: number };
  maxValue: number;
}) {
  const width = maxValue > 0 ? Math.max(8, (datum.value / maxValue) * 100) : 0;

  return (
    <div className="rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-background/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
              datum.palette.avatar,
            )}
          >
            {datum.initials}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{datum.name}</div>
            <div className="text-[11px] text-muted">{datum.share}% of assignments</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', LOAD_BADGE[datum.load])}>
            {datum.load}
          </span>
          <span className="text-sm font-bold tabular-nums">{datum.value}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${width}%`, backgroundColor: datum.palette.color }}
        />
      </div>
    </div>
  );
}

export function AnalystWorkloadChart({ data }: { data: WorkloadChartDatum[] }) {
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, d) => sum + d.value, 0);
    const average = sorted.length > 0 ? total / sorted.length : 0;
    return sorted
      .map((d, index) => enrichDatum(d, index, average))
      .map((d) => ({
        ...d,
        share: total > 0 ? Math.round((d.value / total) * 100) : 0,
      }));
  }, [data]);

  const chartBars = useMemo(
    () => [...chartData].sort((a, b) => a.value - b.value),
    [chartData],
  );

  const totalAssignments = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);
  const analystCount = chartData.length;
  const averageLoad = analystCount > 0 ? Math.round((totalAssignments / analystCount) * 10) / 10 : 0;
  const busiest = chartData[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const minValue = Math.min(...chartData.map((d) => d.value), maxValue);
  const skewed = minValue > 0 && maxValue / minValue >= 2;

  return (
    <ManagerChartPanel
      title="Analyst Workload"
      subtitle="Open case assignments across the analyst team"
      icon={Users}
      action={(
        <Link href="/app/cases" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Case queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    >
      {chartData.length === 0 ? (
        <EmptyState title="No assignments" description="Open cases will show analyst workload here." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Analysts loaded</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{analystCount}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Open assignments</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-primary">{totalAssignments}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Avg per analyst</div>
              <div className="mt-1 text-xl font-bold tabular-nums">{averageLoad}</div>
            </div>
            <div className={cn(
              'rounded-lg border px-3 py-2.5',
              skewed ? 'border-amber-900/40 bg-amber-950/15' : 'border-border bg-background/40',
            )}>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Most loaded</div>
              <div className="mt-1 truncate text-sm font-semibold">{busiest?.name ?? '—'}</div>
              <div className={cn('text-xs tabular-nums', skewed ? 'text-amber-200' : 'text-muted')}>
                {busiest ? `${busiest.value} cases` : '—'}
              </div>
            </div>
          </div>

          {skewed && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-900/35 bg-amber-950/10 px-3 py-2.5 text-xs text-amber-100">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                Workload skew detected — highest load is {Math.round(maxValue / minValue)}× the lightest analyst.
                Consider rebalancing assignments.
              </span>
            </div>
          )}

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <UserCircle2 className="h-3 w-3" />
                Assignment mix
              </span>
              <span className="tabular-nums">{totalAssignments} cases</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-border/80">
              {chartData.map((d) => (
                <div
                  key={d.name}
                  className="h-full transition-[width] duration-300"
                  style={{
                    width: `${d.share}%`,
                    backgroundColor: d.palette.color,
                    minWidth: d.value > 0 ? '4px' : 0,
                  }}
                  title={`${d.name}: ${d.value} (${d.share}%)`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="rounded-lg border border-border/70 bg-background/30 p-3 xl:col-span-3">
              <ResponsiveContainer width="100%" height={Math.max(240, chartBars.length * 44)}>
                <BarChart
                  data={chartBars}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                  barCategoryGap="18%"
                >
                  <defs>
                    {chartBars.map((d) => {
                      const id = `workload-gradient-${slugify(d.name)}`;
                      return (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={d.palette.gradientFrom} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={d.palette.gradientTo} stopOpacity={0.95} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#71767b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={108}
                    tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<WorkloadTooltip />} cursor={{ fill: 'rgba(29, 155, 240, 0.06)' }} />
                  <Bar
                    dataKey="value"
                    name="Open cases"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                    maxBarSize={26}
                    background={{ fill: '#161b22', radius: 6 }}
                  >
                    {chartBars.map((entry) => (
                      <Cell key={entry.name} fill={`url(#workload-gradient-${slugify(entry.name)})`} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      className="fill-foreground text-xs font-semibold"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="xl:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Analyst breakdown</span>
                {skewed && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    Skewed
                  </span>
                )}
              </div>
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {chartData.map((d) => (
                  <AnalystRow key={d.name} datum={d} maxValue={maxValue} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {chartData.map((d) => (
              <span
                key={d.name}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  d.palette.chip,
                )}
              >
                <span className={cn('flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold', d.palette.avatar)}>
                  {d.initials}
                </span>
                {d.name}
                <span className="tabular-nums opacity-80">{d.value}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </ManagerChartPanel>
  );
}
