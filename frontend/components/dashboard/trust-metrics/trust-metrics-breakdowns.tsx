'use client';

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, Sector,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import type { TooltipProps } from 'recharts';
import {
  AlertTriangle, BarChart3, CheckCircle2, Layers, PieChart as PieChartIcon, TrendingUp, Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/components/dashboard/kpi-card';

const AI_ACTION_META: Record<string, {
  color: string;
  gradientFrom: string;
  gradientTo: string;
  chip: string;
  short: string;
  description: string;
}> = {
  Accepted: {
    color: '#10b981',
    gradientFrom: '#34d399',
    gradientTo: '#059669',
    chip: 'border-green-900/40 bg-green-950/20 text-green-300',
    short: 'Accepted',
    description: 'AI recommendation taken as-is',
  },
  Modified: {
    color: '#f59e0b',
    gradientFrom: '#fbbf24',
    gradientTo: '#d97706',
    chip: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
    short: 'Modified',
    description: 'AI output changed before deciding',
  },
  Rejected: {
    color: '#ef4444',
    gradientFrom: '#f87171',
    gradientTo: '#dc2626',
    chip: 'border-red-900/35 bg-red-950/15 text-red-300',
    short: 'Rejected',
    description: 'AI recommendation overridden',
  },
  Escalated: {
    color: '#8b5cf6',
    gradientFrom: '#a78bfa',
    gradientTo: '#7c3aed',
    chip: 'border-purple-900/35 bg-purple-950/15 text-purple-200',
    short: 'Escalated',
    description: 'Case escalated despite AI input',
  },
  'Not Used': {
    color: '#71767b',
    gradientFrom: '#9ca3af',
    gradientTo: '#52525b',
    chip: 'border-border bg-background/60 text-muted',
    short: 'Not used',
    description: 'AI recommendation not applied',
  },
};

const AI_ACTION_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(AI_ACTION_META).map(([k, v]) => [k, v.color]),
);

const SEVERITY_META: Record<string, {
  color: string;
  gradientFrom: string;
  gradientTo: string;
  chip: string;
  short: string;
  description: string;
  order: number;
}> = {
  Critical: {
    color: '#ef4444',
    gradientFrom: '#f87171',
    gradientTo: '#dc2626',
    chip: 'border-red-900/35 bg-red-950/15 text-red-300',
    short: 'Critical',
    description: 'P1 cases where analyst and AI diverged',
    order: 0,
  },
  High: {
    color: '#f59e0b',
    gradientFrom: '#fbbf24',
    gradientTo: '#d97706',
    chip: 'border-amber-900/40 bg-amber-950/15 text-amber-200',
    short: 'High',
    description: 'High-severity cases with alignment gaps',
    order: 1,
  },
  Medium: {
    color: '#1d9bf0',
    gradientFrom: '#38bdf8',
    gradientTo: '#0284c7',
    chip: 'border-primary/35 bg-primary/10 text-primary',
    short: 'Medium',
    description: 'Medium-severity disagreement patterns',
    order: 2,
  },
  Low: {
    color: '#10b981',
    gradientFrom: '#34d399',
    gradientTo: '#059669',
    chip: 'border-green-900/40 bg-green-950/20 text-green-300',
    short: 'Low',
    description: 'Low-severity case misalignment',
    order: 3,
  },
  Informational: {
    color: '#71767b',
    gradientFrom: '#9ca3af',
    gradientTo: '#52525b',
    chip: 'border-border bg-background/60 text-muted',
    short: 'Info',
    description: 'Informational severity disagreements',
    order: 4,
  },
};

const SEVERITY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(SEVERITY_META).map(([k, v]) => [k, v.color]),
);

const SEVERITY_ORDER = Object.entries(SEVERITY_META)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([name]) => name);

const OVERRIDE_REASON_META: Record<string, {
  color: string;
  gradientFrom: string;
  gradientTo: string;
  chip: string;
  short: string;
  description: string;
}> = {
  'Incorrect AI Assessment': {
    color: '#ef4444',
    gradientFrom: '#f87171',
    gradientTo: '#dc2626',
    chip: 'border-red-900/35 bg-red-950/15 text-red-300',
    short: 'Incorrect',
    description: 'AI misclassified or inaccurate recommendation',
  },
  'Insufficient Context': {
    color: '#f59e0b',
    gradientFrom: '#fbbf24',
    gradientTo: '#d97706',
    chip: 'border-amber-900/40 bg-amber-950/15 text-amber-200',
    short: 'Context gap',
    description: 'Missing or incomplete case context for AI',
  },
  'Policy or Client Exception': {
    color: '#8b5cf6',
    gradientFrom: '#a78bfa',
    gradientTo: '#7c3aed',
    chip: 'border-purple-900/35 bg-purple-950/15 text-purple-200',
    short: 'Policy',
    description: 'Client policy or authorized exception applied',
  },
  'Escalation Required': {
    color: '#1d9bf0',
    gradientFrom: '#38bdf8',
    gradientTo: '#0284c7',
    chip: 'border-primary/35 bg-primary/10 text-primary',
    short: 'Escalation',
    description: 'Severity or urgency required escalation',
  },
  Other: {
    color: '#71767b',
    gradientFrom: '#9ca3af',
    gradientTo: '#52525b',
    chip: 'border-border bg-background/60 text-muted',
    short: 'Other',
    description: 'Uncategorized override rationale',
  },
};

const OVERRIDE_CATEGORY_PALETTE = [
  { color: '#8b5cf6', gradientFrom: '#a78bfa', gradientTo: '#7c3aed' },
  { color: '#a78bfa', gradientFrom: '#c4b5fd', gradientTo: '#8b5cf6' },
  { color: '#7c3aed', gradientFrom: '#8b5cf6', gradientTo: '#6d28d9' },
  { color: '#6d28d9', gradientFrom: '#7c3aed', gradientTo: '#5b21b6' },
  { color: '#5b21b6', gradientFrom: '#6d28d9', gradientTo: '#4c1d95' },
];

const OVERRIDE_CATEGORY_COLORS = OVERRIDE_CATEGORY_PALETTE.map((p) => p.color);

type ChartDatum = { name: string; value: number; fill?: string };

function BreakdownTooltip({ active, payload, valueLabel = 'Count' }: TooltipProps<number, string> & { valueLabel?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartDatum & { share?: number };
  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <div className="font-semibold">{row.name}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-3">
        <span className="text-muted">{valueLabel}</span>
        <span className="text-right font-semibold tabular-nums">
          {row.value}{valueLabel.includes('%') ? '%' : ''}
        </span>
        {row.share != null && (
          <>
            <span className="text-muted">Share</span>
            <span className="text-right tabular-nums">{row.share}%</span>
          </>
        )}
      </div>
    </div>
  );
}

function BreakdownPanel({
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/70 bg-background/40 p-3.5', className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="shrink-0 rounded-lg bg-indigo-500/10 p-1.5 text-indigo-300">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function BreakdownEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-background/20 px-3 py-6 text-center text-xs text-muted">
      {message}
    </div>
  );
}

function slugifyAction(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

function enrichActionDatum(datum: ChartDatum) {
  const meta = AI_ACTION_META[datum.name] || {
    color: CHART_COLORS[0],
    gradientFrom: CHART_COLORS[0],
    gradientTo: CHART_COLORS[0],
    chip: 'border-border bg-background/60 text-muted',
    short: datum.name,
    description: 'Analyst response to AI',
  };
  return {
    ...datum,
    meta,
    fill: meta.color,
    gradientId: `action-gradient-${slugifyAction(datum.name)}`,
  };
}

function ActionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichActionDatum> & { share: number };

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.meta.color }} />
        <span className="text-sm font-semibold">{row.name}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{row.meta.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Decisions</span>
        <span className="text-right font-semibold tabular-nums">{row.value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{row.share}%</span>
      </div>
    </div>
  );
}

function ActionActiveShape(props: unknown) {
  const sector = props as PieSectorDataItem;
  const cx = sector.cx ?? 0;
  const cy = sector.cy ?? 0;
  const innerRadius = sector.innerRadius ?? 0;
  const outerRadius = sector.outerRadius ?? 0;
  const startAngle = sector.startAngle ?? 0;
  const endAngle = sector.endAngle ?? 0;
  const fill = sector.fill ?? '#1d9bf0';

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#0f1419"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.12))' }}
    />
  );
}

function ActionShareRow({
  datum,
  maxValue,
  active,
  onHover,
}: {
  datum: ReturnType<typeof enrichActionDatum> & { share: number };
  maxValue: number;
  active: boolean;
  onHover: () => void;
}) {
  const width = maxValue > 0 ? Math.max(6, (datum.value / maxValue) * 100) : 0;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      className={cn(
        'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-border bg-background/55'
          : 'border-transparent hover:border-border/70 hover:bg-background/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium">{datum.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {datum.value}
          <span className="ml-1 text-[10px]">({datum.share}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${datum.meta.gradientFrom}, ${datum.meta.gradientTo})`,
          }}
        />
      </div>
    </button>
  );
}

function AiActionBreakdownChart({ data }: { data: ChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const enriched = data.map(enrichActionDatum);
    const total = enriched.reduce((sum, d) => sum + d.value, 0);
    return enriched.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const topBucket = [...chartData].sort((a, b) => b.value - a.value)[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const acceptedCount = chartData.find((d) => d.name === 'Accepted')?.value ?? 0;
  const overrideCount = chartData
    .filter((d) => ['Modified', 'Rejected', 'Escalated'].includes(d.name))
    .reduce((sum, d) => sum + d.value, 0);
  const acceptedShare = total > 0 ? Math.round((acceptedCount / total) * 100) : 0;

  if (chartData.length === 0) {
    return <BreakdownEmpty message="AI action breakdown appears after analyst decisions." />;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-green-900/35 bg-green-950/10 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Accepted as-is</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-green-400">{acceptedCount}</div>
          <div className="text-[11px] tabular-nums text-muted">{acceptedShare}% of actions</div>
        </div>
        <div className={cn(
          'rounded-lg border px-3 py-2.5',
          overrideCount > 0
            ? 'border-yellow-900/35 bg-yellow-950/10'
            : 'border-border bg-background/40',
        )}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Overrides & changes</div>
          <div className={cn('mt-1 text-xl font-bold tabular-nums', overrideCount > 0 && 'text-yellow-300')}>
            {overrideCount}
          </div>
          <div className="text-[11px] tabular-nums text-muted">
            {total > 0 ? `${Math.round((overrideCount / total) * 100)}% modified or rejected` : '—'}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <PieChartIcon className="h-3 w-3" />
            Action mix
          </span>
          <span className="tabular-nums">{total} decisions</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: `${d.share}%`,
                background: `linear-gradient(180deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})`,
                minWidth: d.value > 0 ? '4px' : 0,
              }}
              title={`${d.name}: ${d.value} (${d.share}%)`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-background/50 to-background/20 p-3 lg:col-span-2">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30"
            style={{
              background: topBucket
                ? `radial-gradient(circle at 50% 0%, ${topBucket.meta.color}40, transparent 70%)`
                : undefined,
            }}
          />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={[{ value: 1 }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={88}
                fill="#1a1f26"
                stroke="#2f3336"
                strokeWidth={1}
                isAnimationActive={false}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
                stroke="#0f1419"
                strokeWidth={2}
                activeIndex={activeIndex}
                activeShape={ActionActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    opacity={activeIndex == null || activeIndex === index ? 1 : 0.45}
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<ActionTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums">{total}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted">decisions</div>
              {topBucket && (
                <div className="mt-1.5 inline-flex max-w-[120px] items-center justify-center gap-1 truncate rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: topBucket.meta.color }}
                  />
                  Top: {topBucket.meta.short}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By action type</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <CheckCircle2 className="h-3 w-3" />
              Hover to highlight
            </span>
          </div>
          <div className="space-y-1">
            {[...chartData]
              .sort((a, b) => b.value - a.value)
              .map((d) => {
                const index = chartData.findIndex((item) => item.name === d.name);
                return (
                  <ActionShareRow
                    key={d.name}
                    datum={d}
                    maxValue={maxValue}
                    active={activeIndex === index}
                    onHover={() => setActiveIndex(index)}
                  />
                );
              })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((d) => (
          <span
            key={d.name}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
              d.meta.chip,
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `linear-gradient(135deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})` }}
            />
            {d.meta.short}
            <span className="tabular-nums opacity-90">{d.value}</span>
            <span className="text-[10px] opacity-70">({d.share}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

function slugifyOverride(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function enrichOverrideDatum(datum: ChartDatum, index: number) {
  const known = OVERRIDE_REASON_META[datum.name];
  const palette = OVERRIDE_CATEGORY_PALETTE[index % OVERRIDE_CATEGORY_PALETTE.length];
  const meta = known || {
    color: palette.color,
    gradientFrom: palette.gradientFrom,
    gradientTo: palette.gradientTo,
    chip: 'border-purple-900/35 bg-purple-950/15 text-purple-200',
    short: datum.name.length > 14 ? `${datum.name.slice(0, 12)}…` : datum.name,
    description: 'Override reason category',
  };
  return {
    ...datum,
    meta,
    fill: meta.color,
    gradientId: `override-gradient-${slugifyOverride(datum.name)}`,
    shortLabel: meta.short,
  };
}

function OverrideReasonTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichOverrideDatum> & { share: number };

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.meta.color }} />
        <span className="text-sm font-semibold">{row.name}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{row.meta.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Overrides</span>
        <span className="text-right font-semibold tabular-nums">{row.value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{row.share}%</span>
      </div>
    </div>
  );
}

function OverrideReasonShareRow({
  datum,
  maxValue,
  active,
  onHover,
}: {
  datum: ReturnType<typeof enrichOverrideDatum> & { share: number };
  maxValue: number;
  active: boolean;
  onHover: () => void;
}) {
  const width = maxValue > 0 ? Math.max(6, (datum.value / maxValue) * 100) : 0;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      className={cn(
        'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-purple-900/40 bg-purple-950/10'
          : 'border-transparent hover:border-border/70 hover:bg-background/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium" title={datum.name}>{datum.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {datum.value}
          <span className="ml-1 text-[10px]">({datum.share}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${datum.meta.gradientFrom}, ${datum.meta.gradientTo})`,
          }}
        />
      </div>
    </button>
  );
}

function OverrideReasonsChart({ data }: { data: ChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const enriched = sorted.map((d, i) => enrichOverrideDatum(d, i));
    const total = enriched.reduce((sum, d) => sum + d.value, 0);
    return enriched.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const topBucket = chartData[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const yMax = Math.max(maxValue + 1, Math.ceil(maxValue * 1.15));
  const categoryCount = chartData.length;

  if (chartData.length === 0) {
    return <BreakdownEmpty message="Override categories appear when analysts override AI." />;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-purple-900/35 bg-purple-950/10 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Top reason</div>
          <div className="mt-1 truncate text-sm font-semibold text-purple-200">{topBucket.name}</div>
          <div className="text-[11px] tabular-nums text-muted">
            {topBucket.value} override{topBucket.value === 1 ? '' : 's'} ({topBucket.share}%)
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Categories</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{categoryCount}</div>
          <div className="text-[11px] tabular-nums text-muted">{total} total overrides</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Reason mix
          </span>
          <span className="tabular-nums">{total} overrides</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: `${d.share}%`,
                background: `linear-gradient(180deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})`,
                minWidth: d.value > 0 ? '4px' : 0,
              }}
              title={`${d.name}: ${d.value} (${d.share}%)`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-purple-950/10 to-background/20 p-3 lg:col-span-3">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-25"
            style={{
              background: topBucket
                ? `radial-gradient(circle at 50% 0%, ${topBucket.meta.color}50, transparent 70%)`
                : undefined,
            }}
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="22%"
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }}
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
              <Tooltip content={<OverrideReasonTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }} />
              <Bar
                dataKey="value"
                name="Overrides"
                radius={[6, 6, 0, 0]}
                barSize={36}
                maxBarSize={44}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    opacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  fill="#a1a1aa"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By category</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <CheckCircle2 className="h-3 w-3" />
              Hover to highlight
            </span>
          </div>
          <div className="space-y-1">
            {chartData.map((d, index) => (
              <OverrideReasonShareRow
                key={d.name}
                datum={d}
                maxValue={maxValue}
                active={activeIndex === index}
                onHover={() => setActiveIndex(index)}
              />
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
              d.meta.chip,
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: `linear-gradient(135deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})` }}
            />
            {d.meta.short}
            <span className="tabular-nums opacity-90">{d.value}</span>
            <span className="text-[10px] opacity-70">({d.share}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

function slugifySeverity(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function enrichSeverityDatum(datum: ChartDatum) {
  const meta = SEVERITY_META[datum.name] || {
    color: '#ef4444',
    gradientFrom: '#f87171',
    gradientTo: '#dc2626',
    chip: 'border-red-900/35 bg-red-950/15 text-red-300',
    short: datum.name,
    description: 'Human–AI disagreement rate',
    order: 99,
  };
  return {
    ...datum,
    meta,
    fill: meta.color,
    gradientId: `severity-gradient-${slugifySeverity(datum.name)}`,
    shortLabel: meta.short,
  };
}

function getDisagreementRisk(rate: number) {
  if (rate > 25) return { label: 'High risk', tone: 'danger' as const };
  if (rate > 15) return { label: 'Elevated', tone: 'warn' as const };
  if (rate > 0) return { label: 'Low', tone: 'good' as const };
  return { label: 'None', tone: 'neutral' as const };
}

const RISK_CHIP_STYLES = {
  danger: 'border-red-900/35 bg-red-950/15 text-red-300',
  warn: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
  good: 'border-green-900/40 bg-green-950/20 text-green-300',
  neutral: 'border-border bg-background/60 text-muted',
};

function DisagreementSeverityTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichSeverityDatum>;
  const risk = getDisagreementRisk(row.value);

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.meta.color }} />
        <span className="text-sm font-semibold">{row.name}</span>
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[10px] font-medium', RISK_CHIP_STYLES[risk.tone])}>
          {risk.label}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">{row.meta.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Disagreement</span>
        <span className="text-right font-semibold tabular-nums">{row.value}%</span>
        <span className="text-muted">Threshold</span>
        <span className="text-right tabular-nums text-muted">25% alert</span>
      </div>
    </div>
  );
}

function DisagreementSeverityShareRow({
  datum,
  active,
  onHover,
}: {
  datum: ReturnType<typeof enrichSeverityDatum>;
  active: boolean;
  onHover: () => void;
}) {
  const risk = getDisagreementRisk(datum.value);
  const width = Math.min(100, Math.max(0, datum.value));

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      className={cn(
        'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-border bg-background/55'
          : 'border-transparent hover:border-border/70 hover:bg-background/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium">{datum.name}</span>
        </span>
        <span className={cn(
          'shrink-0 tabular-nums font-semibold',
          risk.tone === 'danger' && 'text-red-300',
          risk.tone === 'warn' && 'text-yellow-300',
          risk.tone === 'good' && 'text-green-400',
          risk.tone === 'neutral' && 'text-muted',
        )}>
          {datum.value}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${datum.meta.gradientFrom}, ${datum.meta.gradientTo})`,
          }}
        />
      </div>
    </button>
  );
}

function DisagreementBySeverityChart({ data }: { data: ChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const byName = new Map(data.map((d) => [d.name, d]));
    return SEVERITY_ORDER
      .map((name) => byName.get(name))
      .filter((d): d is ChartDatum => d != null && d.value >= 0)
      .map(enrichSeverityDatum);
  }, [data]);

  const peak = useMemo(
    () => [...chartData].sort((a, b) => b.value - a.value)[0],
    [chartData],
  );
  const avgRate = chartData.length > 0
    ? Math.round((chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length) * 10) / 10
    : 0;
  const elevatedCount = chartData.filter((d) => d.value > 15).length;
  const rateSum = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return <BreakdownEmpty message="Requires decisions with agreement tracking." />;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-lg border px-3 py-2.5',
          peak && peak.value > 25
            ? 'border-red-900/35 bg-red-950/10'
            : peak && peak.value > 15
              ? 'border-yellow-900/35 bg-yellow-950/10'
              : 'border-border bg-background/40',
        )}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Peak severity</div>
          <div className={cn(
            'mt-1 truncate text-sm font-semibold',
            peak && peak.value > 25 && 'text-red-300',
            peak && peak.value > 15 && peak.value <= 25 && 'text-yellow-300',
          )}>
            {peak?.name ?? '—'}
          </div>
          <div className="text-[11px] tabular-nums text-muted">{peak?.value ?? 0}% disagreement</div>
        </div>
        <div className="rounded-lg border border-border bg-background/40 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Average rate</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{avgRate}%</div>
          <div className="text-[11px] tabular-nums text-muted">
            {elevatedCount} severity level{elevatedCount === 1 ? '' : 's'} above 15%
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Disagreement intensity
          </span>
          <span className="tabular-nums">25% alert threshold</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: rateSum > 0 ? `${(d.value / rateSum) * 100}%` : `${100 / chartData.length}%`,
                background: `linear-gradient(180deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})`,
                minWidth: d.value > 0 ? '4px' : 0,
              }}
              title={`${d.name}: ${d.value}% disagreement`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-red-950/8 to-background/20 p-3 lg:col-span-3">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-25"
            style={{
              background: peak
                ? `radial-gradient(circle at 50% 0%, ${peak.meta.color}50, transparent 70%)`
                : undefined,
            }}
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="22%"
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: '#2f3336' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#71767b', fontSize: 11 }}
                unit="%"
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <ReferenceLine
                y={25}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: '25% alert',
                  position: 'insideTopRight',
                  fill: '#71767b',
                  fontSize: 10,
                }}
              />
              <Tooltip content={<DisagreementSeverityTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.06)' }} />
              <Bar
                dataKey="value"
                name="Disagreement %"
                radius={[6, 6, 0, 0]}
                barSize={36}
                maxBarSize={44}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    opacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => `${value}%`}
                  fill="#a1a1aa"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By severity</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <CheckCircle2 className="h-3 w-3" />
              Hover to highlight
            </span>
          </div>
          <div className="space-y-1">
            {chartData.map((d, index) => (
              <DisagreementSeverityShareRow
                key={d.name}
                datum={d}
                active={activeIndex === index}
                onHover={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((d) => {
          const risk = getDisagreementRisk(d.value);
          return (
            <span
              key={d.name}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                d.meta.chip,
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: `linear-gradient(135deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})` }}
              />
              {d.meta.short}
              <span className={cn(
                'tabular-nums',
                risk.tone === 'danger' && 'text-red-300',
                risk.tone === 'warn' && 'text-yellow-200',
              )}>
                {d.value}%
              </span>
            </span>
          );
        })}
      </div>
    </>
  );
}

const ANALYST_OVERRIDE_PALETTE = [
  { color: '#f59e0b', gradientFrom: '#fbbf24', gradientTo: '#d97706' },
  { color: '#fb923c', gradientFrom: '#fdba74', gradientTo: '#ea580c' },
  { color: '#f97316', gradientFrom: '#fb923c', gradientTo: '#c2410c' },
  { color: '#eab308', gradientFrom: '#fde047', gradientTo: '#ca8a04' },
  { color: '#d97706', gradientFrom: '#fbbf24', gradientTo: '#92400e' },
  { color: '#b45309', gradientFrom: '#d97706', gradientTo: '#78350f' },
];

function slugifyAnalyst(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function enrichAnalystDatum(datum: ChartDatum, index: number) {
  const palette = ANALYST_OVERRIDE_PALETTE[index % ANALYST_OVERRIDE_PALETTE.length];
  return {
    ...datum,
    meta: palette,
    fill: palette.color,
    gradientId: `analyst-gradient-${slugifyAnalyst(datum.name)}`,
    rank: index + 1,
  };
}

function AnalystOverrideTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichAnalystDatum> & { share: number };

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-950/30 text-[10px] font-bold text-amber-200">
          #{row.rank}
        </span>
        <span className="text-sm font-semibold">{row.name}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Overrides</span>
        <span className="text-right font-semibold tabular-nums">{row.value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{row.share}%</span>
      </div>
    </div>
  );
}

function AnalystOverrideShareRow({
  datum,
  maxValue,
  active,
  onHover,
}: {
  datum: ReturnType<typeof enrichAnalystDatum> & { share: number };
  maxValue: number;
  active: boolean;
  onHover: () => void;
}) {
  const width = maxValue > 0 ? Math.max(6, (datum.value / maxValue) * 100) : 0;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      className={cn(
        'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-amber-900/40 bg-amber-950/10'
          : 'border-transparent hover:border-border/70 hover:bg-background/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-950/25 text-[10px] font-bold text-amber-200">
            {datum.rank}
          </span>
          <span className="truncate font-medium" title={datum.name}>{datum.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {datum.value}
          <span className="ml-1 text-[10px]">({datum.share}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${datum.meta.gradientFrom}, ${datum.meta.gradientTo})`,
          }}
        />
      </div>
    </button>
  );
}

function AnalystOverridesChart({ data }: { data: ChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const enriched = sorted.map((d, i) => enrichAnalystDatum(d, i));
    const total = enriched.reduce((sum, d) => sum + d.value, 0);
    return enriched.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const topAnalyst = chartData[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const xMax = Math.max(maxValue + 1, Math.ceil(maxValue * 1.15));
  const isSkewed = topAnalyst != null && topAnalyst.share > 50;

  if (chartData.length === 0) {
    return <BreakdownEmpty message="Per-analyst override counts will appear here." />;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-amber-900/35 bg-amber-950/10 px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Top analyst</div>
          <div className="mt-1 truncate text-sm font-semibold text-amber-200">{topAnalyst.name}</div>
          <div className="text-[11px] tabular-nums text-muted">
            {topAnalyst.value} override{topAnalyst.value === 1 ? '' : 's'} ({topAnalyst.share}%)
          </div>
        </div>
        <div className={cn(
          'rounded-lg border px-3 py-2.5',
          isSkewed ? 'border-yellow-900/35 bg-yellow-950/10' : 'border-border bg-background/40',
        )}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Analysts tracked</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{chartData.length}</div>
          <div className="text-[11px] tabular-nums text-muted">
            {total} total override{total === 1 ? '' : 's'}
            {isSkewed ? ' · skewed' : ''}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            Override distribution
          </span>
          <span className="tabular-nums">{total} overrides</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: `${d.share}%`,
                background: `linear-gradient(180deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})`,
                minWidth: d.value > 0 ? '4px' : 0,
              }}
              title={`${d.name}: ${d.value} (${d.share}%)`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-amber-950/10 to-background/20 p-3 lg:col-span-3">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-25"
            style={{
              background: topAnalyst
                ? `radial-gradient(circle at 50% 0%, ${topAnalyst.meta.color}50, transparent 70%)`
                : undefined,
            }}
          />
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
              barCategoryGap="18%"
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, xMax]}
                tick={{ fill: '#71767b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={112}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<AnalystOverrideTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />
              <Bar
                dataKey="value"
                name="Overrides"
                radius={[0, 6, 6, 0]}
                barSize={24}
                maxBarSize={28}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    opacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="#a1a1aa"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Ranked analysts</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <CheckCircle2 className="h-3 w-3" />
              Hover to highlight
            </span>
          </div>
          <div className="max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {chartData.map((d, index) => (
              <AnalystOverrideShareRow
                key={d.name}
                datum={d}
                maxValue={maxValue}
                active={activeIndex === index}
                onHover={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.slice(0, 6).map((d) => (
          <span
            key={d.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/35 bg-amber-950/15 px-2.5 py-1 text-[11px] font-medium text-amber-200"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-950/30 text-[9px] font-bold">
              {d.rank}
            </span>
            <span className="max-w-[100px] truncate">{d.name}</span>
            <span className="tabular-nums opacity-90">{d.value}</span>
            <span className="text-[10px] opacity-70">({d.share}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

const DISPOSITION_OVERRIDE_PALETTE = [
  { color: '#ef4444', gradientFrom: '#f87171', gradientTo: '#dc2626' },
  { color: '#f97316', gradientFrom: '#fb923c', gradientTo: '#c2410c' },
  { color: '#ec4899', gradientFrom: '#f472b6', gradientTo: '#db2777' },
  { color: '#e11d48', gradientFrom: '#fb7185', gradientTo: '#be123c' },
  { color: '#dc2626', gradientFrom: '#ef4444', gradientTo: '#991b1b' },
  { color: '#b91c1c', gradientFrom: '#dc2626', gradientTo: '#7f1d1d' },
];

function shortDisposition(name: string) {
  if (name.includes(' - ')) return name.split(' - ')[0];
  if (name.length > 20) return `${name.slice(0, 18)}…`;
  return name;
}

function slugifyDisposition(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

function enrichDispositionDatum(datum: ChartDatum, index: number) {
  const palette = DISPOSITION_OVERRIDE_PALETTE[index % DISPOSITION_OVERRIDE_PALETTE.length];
  return {
    ...datum,
    meta: palette,
    fill: palette.color,
    gradientId: `disposition-gradient-${slugifyDisposition(datum.name)}`,
    shortLabel: shortDisposition(datum.name),
    rank: index + 1,
  };
}

function DispositionOverrideTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ReturnType<typeof enrichDispositionDatum> & { share: number };

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.meta.color }} />
        <div className="min-w-0">
          <span className="text-sm font-semibold leading-snug">{row.name}</span>
          {row.shortLabel !== row.name && (
            <p className="mt-0.5 text-[11px] text-muted">Analyst-selected disposition when overriding AI</p>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted">Overrides</span>
        <span className="text-right font-semibold tabular-nums">{row.value}</span>
        <span className="text-muted">Share</span>
        <span className="text-right font-medium tabular-nums">{row.share}%</span>
      </div>
    </div>
  );
}

function DispositionOverrideShareRow({
  datum,
  maxValue,
  active,
  onHover,
}: {
  datum: ReturnType<typeof enrichDispositionDatum> & { share: number };
  maxValue: number;
  active: boolean;
  onHover: () => void;
}) {
  const width = maxValue > 0 ? Math.max(6, (datum.value / maxValue) * 100) : 0;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      className={cn(
        'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
        active
          ? 'border-red-900/35 bg-red-950/10'
          : 'border-transparent hover:border-border/70 hover:bg-background/35',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: datum.meta.color }} />
          <span className="truncate font-medium" title={datum.name}>{datum.name}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {datum.value}
          <span className="ml-1 text-[10px]">({datum.share}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${datum.meta.gradientFrom}, ${datum.meta.gradientTo})`,
          }}
        />
      </div>
    </button>
  );
}

function DispositionOverridesChart({ data }: { data: ChartDatum[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const enriched = sorted.map((d, i) => enrichDispositionDatum(d, i));
    const total = enriched.reduce((sum, d) => sum + d.value, 0);
    return enriched.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [data]);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const topDisposition = chartData[0];
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const xMax = Math.max(maxValue + 1, Math.ceil(maxValue * 1.15));
  const isConcentrated = topDisposition != null && topDisposition.share > 40;

  if (chartData.length === 0) {
    return <BreakdownEmpty message="Disposition breakdown appears with override activity." />;
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-red-900/35 bg-red-950/10 px-3 py-2.5 sm:col-span-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Top disposition</div>
          <div className="mt-1 truncate text-sm font-semibold text-red-300" title={topDisposition.name}>
            {topDisposition.name}
          </div>
          <div className="text-[11px] tabular-nums text-muted">
            {topDisposition.value} override{topDisposition.value === 1 ? '' : 's'} ({topDisposition.share}%)
          </div>
        </div>
        <div className={cn(
          'rounded-lg border px-3 py-2.5',
          isConcentrated ? 'border-yellow-900/35 bg-yellow-950/10' : 'border-border bg-background/40',
        )}>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">Disposition types</div>
          <div className="mt-1 text-xl font-bold tabular-nums">{chartData.length}</div>
          <div className="text-[11px] tabular-nums text-muted">{total} total overrides</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Disposition mix
          </span>
          <span className="tabular-nums">{total} overrides</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {chartData.map((d) => (
            <div
              key={d.name}
              className="h-full transition-all duration-300"
              style={{
                width: `${d.share}%`,
                background: `linear-gradient(180deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})`,
                minWidth: d.value > 0 ? '4px' : 0,
              }}
              title={`${d.name}: ${d.value} (${d.share}%)`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-red-950/10 to-background/20 p-3 lg:col-span-3">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-25"
            style={{
              background: topDisposition
                ? `radial-gradient(circle at 50% 0%, ${topDisposition.meta.color}50, transparent 70%)`
                : undefined,
            }}
          />
          <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 4, bottom: 4 }}
              barCategoryGap="16%"
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <defs>
                {chartData.map((d) => (
                  <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={d.meta.gradientFrom} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={d.meta.gradientTo} stopOpacity={0.85} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                domain={[0, xMax]}
                tick={{ fill: '#71767b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="shortLabel"
                type="category"
                width={120}
                tick={{ fill: '#a1a1aa', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<DispositionOverrideTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.08)' }} />
              <Bar
                dataKey="value"
                name="Overrides"
                radius={[0, 6, 6, 0]}
                barSize={22}
                maxBarSize={26}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={`url(#${entry.gradientId})`}
                    opacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="#a1a1aa"
                  fontSize={11}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">By disposition</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <CheckCircle2 className="h-3 w-3" />
              Hover to highlight
            </span>
          </div>
          <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
            {chartData.map((d, index) => (
              <DispositionOverrideShareRow
                key={d.name}
                datum={d}
                maxValue={maxValue}
                active={activeIndex === index}
                onHover={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.slice(0, 8).map((d) => (
          <span
            key={d.name}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-red-900/35 bg-red-950/15 px-2.5 py-1 text-[11px] font-medium text-red-300"
            title={d.name}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: `linear-gradient(135deg, ${d.meta.gradientFrom}, ${d.meta.gradientTo})` }}
            />
            <span className="truncate">{d.shortLabel}</span>
            <span className="shrink-0 tabular-nums opacity-90">{d.value}</span>
            <span className="shrink-0 text-[10px] opacity-70">({d.share}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

export function TrustMetricsBreakdowns({
  actionData,
  overrideCategories,
  disagreementBySeverity,
  analystOverrides,
  dispositionOverrides,
}: {
  actionData: ChartDatum[];
  overrideCategories: ChartDatum[];
  disagreementBySeverity: ChartDatum[];
  analystOverrides: ChartDatum[];
  dispositionOverrides: ChartDatum[];
}) {
  const actionChart = useMemo(() => {
    const total = actionData.reduce((sum, d) => sum + d.value, 0);
    return actionData.map((d) => ({
      ...d,
      fill: d.fill || AI_ACTION_COLORS[d.name] || CHART_COLORS[0],
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [actionData]);

  const overrideChart = useMemo(() => {
    const total = overrideCategories.reduce((sum, d) => sum + d.value, 0);
    return overrideCategories.map((d, i) => ({
      ...d,
      fill: OVERRIDE_CATEGORY_COLORS[i % OVERRIDE_CATEGORY_COLORS.length],
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [overrideCategories]);

  const disagreementChart = useMemo(() => disagreementBySeverity.map((d) => ({
    ...d,
    fill: SEVERITY_COLORS[d.name] || '#ef4444',
  })), [disagreementBySeverity]);

  const analystChart = useMemo(() => {
    const total = analystOverrides.reduce((sum, d) => sum + d.value, 0);
    return analystOverrides.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [analystOverrides]);

  const dispositionChart = useMemo(() => {
    const total = dispositionOverrides.reduce((sum, d) => sum + d.value, 0);
    return dispositionOverrides.map((d) => ({
      ...d,
      share: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [dispositionOverrides]);

  const actionTotal = actionChart.reduce((sum, d) => sum + d.value, 0);
  const overrideTotal = overrideChart.reduce((sum, d) => sum + d.value, 0);
  const analystOverrideTotal = analystChart.reduce((sum, d) => sum + d.value, 0);
  const topAction = actionChart[0];
  const topOverrideReason = overrideChart[0];
  const topAnalyst = analystChart[0];
  const peakDisagreement = [...disagreementChart].sort((a, b) => b.value - a.value)[0];
  const hasAnyData = actionTotal > 0 || overrideTotal > 0 || disagreementChart.length > 0;

  return (
    <Card className="mb-6 overflow-hidden border-indigo-900/25 bg-gradient-to-br from-indigo-950/12 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-300">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Breakdowns</h3>
              {hasAnyData && (
                <span className="rounded-full border border-indigo-900/35 bg-indigo-950/20 px-2 py-0.5 text-[10px] font-medium text-indigo-200">
                  {actionTotal} decision{actionTotal === 1 ? '' : 's'} analyzed
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Distribution of AI actions, overrides, and human–AI disagreements
            </p>
          </div>
        </div>
        {overrideTotal > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">
              <span className="font-medium text-foreground">{overrideTotal}</span> categorized override{overrideTotal === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Top AI action</div>
          <div className="mt-1 truncate text-sm font-semibold">{topAction?.name ?? '—'}</div>
          <div className="text-xs tabular-nums text-muted">
            {topAction ? `${topAction.value} (${topAction.share}%)` : 'No decisions yet'}
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Top override reason</div>
          <div className="mt-1 truncate text-sm font-semibold">{topOverrideReason?.name ?? '—'}</div>
          <div className="text-xs tabular-nums text-muted">
            {topOverrideReason ? `${topOverrideReason.value} (${topOverrideReason.share}%)` : 'No overrides'}
          </div>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Peak disagreement</div>
          <div className="mt-1 truncate text-sm font-semibold">{peakDisagreement?.name ?? '—'}</div>
          <div className="text-xs tabular-nums text-muted">
            {peakDisagreement ? `${peakDisagreement.value}% rate` : 'No disagreement data'}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreakdownPanel
          title="AI action breakdown"
          subtitle="How analysts responded to AI recommendations"
          icon={PieChartIcon}
          badge={actionTotal > 0 && (
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
              {actionTotal} total
            </span>
          )}
        >
          <AiActionBreakdownChart data={actionData} />
        </BreakdownPanel>

        <BreakdownPanel
          title="Override reasons"
          subtitle="Why analysts modified or rejected AI output"
          icon={BarChart3}
          badge={overrideTotal > 0 && (
            <span className="rounded-full border border-purple-900/35 bg-purple-950/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-purple-200">
              {overrideTotal} overrides
            </span>
          )}
        >
          <OverrideReasonsChart data={overrideCategories} />
        </BreakdownPanel>

        <BreakdownPanel
          title="Disagreement by severity"
          subtitle="Human–AI disagreement rate per case severity"
          icon={AlertTriangle}
          badge={peakDisagreement && (
            <span className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
              peakDisagreement.value > 25
                ? 'border-red-900/35 bg-red-950/15 text-red-300'
                : 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
            )}>
              Peak {peakDisagreement.value}%
            </span>
          )}
        >
          <DisagreementBySeverityChart data={disagreementBySeverity} />
        </BreakdownPanel>

        <BreakdownPanel
          title="Overrides by analyst"
          subtitle="Who is overriding AI most frequently"
          icon={Users}
          badge={topAnalyst && (
            <span className="rounded-full border border-amber-900/35 bg-amber-950/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              Top: {topAnalyst.name}
            </span>
          )}
        >
          <AnalystOverridesChart data={analystOverrides} />
        </BreakdownPanel>
      </div>

      <div className="mt-4">
        <BreakdownPanel
          title="Overrides by disposition"
          subtitle="Which dispositions analysts chose when overriding AI"
          icon={BarChart3}
          badge={dispositionChart.length > 0 && (
            <span className="rounded-full border border-red-900/35 bg-red-950/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-red-300">
              {dispositionChart.reduce((sum, d) => sum + d.value, 0)} total
            </span>
          )}
        >
          <DispositionOverridesChart data={dispositionOverrides} />
        </BreakdownPanel>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-foreground">{actionTotal}</span> AI actions
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{overrideTotal}</span> override reasons
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{analystOverrideTotal}</span> analyst overrides
          </span>
          {peakDisagreement && (
            <>
              <span className="hidden sm:inline text-border">·</span>
              <span>
                Peak disagreement{' '}
                <span className="font-medium text-foreground">{peakDisagreement.value}%</span>
                {' '}({peakDisagreement.name})
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
