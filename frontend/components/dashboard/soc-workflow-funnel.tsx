'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar,
  ChevronRight,
  Layers,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WorkflowFunnel, WorkflowFunnelStage } from '@/types';

const STAGE_ICONS: Record<string, LucideIcon> = {
  alerts_received: BellRing,
  alerts_triaged: Layers,
  incidents: AlertTriangle,
  confirmed_incidents: ShieldCheck,
};

const SEVERITY_LABELS: Record<string, string> = {
  High: '2-High',
  Medium: '3-Medium',
  Low: '4-Low',
  Informational: '5-Informational',
};

const HIGHER_IS_BAD: Record<string, boolean> = {
  alerts_received: true,
  alerts_triaged: false,
  incidents: true,
  confirmed_incidents: true,
};

const FUNNEL_H = 108;
const FUNNEL_TAPER = 0.52;
const FUNNEL_PAD = 4;

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatPeriodRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: 'numeric' })}`;
}

function formatBreakdownLabel(stageId: string, label: string) {
  if (stageId === 'incidents' || stageId === 'confirmed_incidents') {
    return SEVERITY_LABELS[label] || label;
  }
  return label;
}

function funnelEdgeY(index: number, totalStages: number, edge: 'top' | 'bottom') {
  const n = totalStages;
  const taperSpan = FUNNEL_H * FUNNEL_TAPER - FUNNEL_PAD;
  const offset = (index / n) * taperSpan;
  if (edge === 'top') return FUNNEL_PAD + offset;
  return FUNNEL_H - FUNNEL_PAD - offset;
}

function TrendBadge({ stageId, pct = 0 }: { stageId: string; pct?: number }) {
  const abs = Math.abs(pct);
  const isFlat = abs < 0.01;
  const isUp = pct > 0;
  const higherIsBad = HIGHER_IS_BAD[stageId] ?? true;
  const isGood = isFlat ? null : (isUp && !higherIsBad) || (!isUp && higherIsBad);

  const tone = isFlat
    ? 'border-yellow-700/40 bg-yellow-900/20 text-yellow-200'
    : isGood
      ? 'border-green-700/40 bg-green-900/20 text-green-300'
      : 'border-red-700/40 bg-red-900/20 text-red-300';

  const Icon = isFlat ? null : isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        tone,
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : <span className="text-[10px]">→</span>}
      {isFlat ? '0.00%' : `${abs.toFixed(2)}%`}
    </span>
  );
}

function buildSegmentPath(index: number, totalStages: number, W = 100): string {
  const n = totalStages;
  const t1 = funnelEdgeY(index, n, 'top');
  const t2 = funnelEdgeY(index + 1, n, 'top');
  const b1 = funnelEdgeY(index, n, 'bottom');
  const b2 = funnelEdgeY(index + 1, n, 'bottom');
  const mx = W / 2;
  const topMid = (t1 + t2) / 2;
  const botMid = (b1 + b2) / 2;

  if (index === n - 1) {
    const tipY = (t2 + b2) / 2;
    return [
      `M 0 ${t1}`,
      `Q ${mx} ${topMid} ${W} ${tipY}`,
      `Q ${mx} ${botMid} 0 ${b1}`,
      'Z',
    ].join(' ');
  }

  return [
    `M 0 ${t1}`,
    `Q ${mx} ${topMid} ${W} ${t2}`,
    `L ${W} ${b2}`,
    `Q ${mx} ${botMid} 0 ${b1}`,
    'Z',
  ].join(' ');
}

function FunnelSegment({
  stage,
  index,
  totalStages,
  gradientId,
}: {
  stage: WorkflowFunnelStage;
  index: number;
  totalStages: number;
  gradientId: string;
}) {
  const W = 100;
  const d = buildSegmentPath(index, totalStages, W);

  return (
    <div className="relative w-full" style={{ height: FUNNEL_H }}>
      <svg viewBox={`0 0 ${W} ${FUNNEL_H}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stage.color} stopOpacity="1" />
            <stop offset="55%" stopColor={stage.color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={stage.color} stopOpacity="0.78" />
          </linearGradient>
        </defs>
        <path
          d={d}
          fill={`url(#${gradientId})`}
          opacity={stage.total > 0 ? 1 : 0.5}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.75"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: stage.total > 0 ? 1 : 0.7 }}
      >
        <span className="text-xl font-bold tabular-nums leading-none text-white drop-shadow-md md:text-2xl">
          {stage.total}
        </span>
      </div>
    </div>
  );
}

function FunnelBarFull({ stages }: { stages: WorkflowFunnelStage[] }) {
  const n = stages.length;

  return (
    <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, height: FUNNEL_H }}>
      {stages.map((stage, i) => (
        <FunnelSegment
          key={stage.id}
          stage={stage}
          index={i}
          totalStages={n}
          gradientId={`funnel-grad-mobile-${stage.id}`}
        />
      ))}
    </div>
  );
}

function StageHeader({ stage, periodLabel }: { stage: WorkflowFunnelStage; periodLabel: string }) {
  const Icon = STAGE_ICONS[stage.id] || BellRing;

  return (
    <div className="px-4 py-4">
      <div className="mb-2 h-0.5 w-8 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden />
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/60"
          style={{ backgroundColor: `${stage.color}22`, color: stage.color }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{stage.label}</div>
          <div className="mt-0.5 text-[11px] text-muted">{periodLabel}</div>
          <div className="mt-2">
            <TrendBadge stageId={stage.id} pct={stage.trend_pct} />
          </div>
        </div>
      </div>
      <Link
        href="/app/cases"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        View insights
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function StageBreakdown({
  stage,
  loading,
}: {
  stage: WorkflowFunnelStage;
  loading?: boolean;
}) {
  return (
    <ul className={cn('space-y-0.5 px-4 pb-5 pt-4', loading && 'opacity-60')}>
      {stage.breakdown.length === 0 ? (
        <li className="py-1 text-xs text-muted">No activity in period</li>
      ) : (
        stage.breakdown.map((row) => (
          <li key={row.label}>
            <Link
              href="/app/cases"
              className="group flex items-center justify-between gap-2 rounded-md border border-transparent py-1.5 pl-2 pr-1 transition-colors hover:border-border/60 hover:bg-primary/5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                  aria-hidden
                />
                <span className="truncate text-sm text-muted group-hover:text-foreground">
                  {formatBreakdownLabel(stage.id, row.label)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold tabular-nums text-foreground">
                {row.count}
                <ChevronRight className="h-3.5 w-3.5 text-muted group-hover:text-primary" />
              </span>
            </Link>
          </li>
        ))
      )}
    </ul>
  );
}

function WorkflowColumn({
  stage,
  index,
  totalStages,
  periodLabel,
  loading,
}: {
  stage: WorkflowFunnelStage;
  index: number;
  totalStages: number;
  periodLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <StageHeader stage={stage} periodLabel={periodLabel} />

      <div className="border-y border-border bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 via-background/30 to-background/10 px-3 py-5">
        <FunnelSegment
          stage={stage}
          index={index}
          totalStages={totalStages}
          gradientId={`funnel-grad-${stage.id}`}
        />
        <p
          className="mt-2 truncate text-center text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: stage.color }}
        >
          {stage.label}
        </p>
      </div>

      <StageBreakdown stage={stage} loading={loading} />
    </div>
  );
}

export function SocWorkflowFunnel({
  funnel,
  days,
  onDaysChange,
  loading,
}: {
  funnel: WorkflowFunnel;
  days: number;
  onDaysChange: (days: number) => void;
  loading?: boolean;
}) {
  const periodLabel = `${formatShortDate(funnel.period_start)} – ${formatShortDate(funnel.period_end)}`;
  const fullPeriod = formatPeriodRange(funnel.period_start, funnel.period_end);
  const n = funnel.stages.length;

  return (
    <Card className="mb-6 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <CardTitle>Security Alerts &amp; Incidents</CardTitle>
        <Link
          href="/app/cases"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View more
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border bg-primary/5 px-5 py-3">
        <Select
          value={String(days)}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="h-9 min-w-[9.5rem] rounded-full border-border/80 bg-card px-4 text-sm shadow-sm"
          disabled={loading}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <Calendar className="h-4 w-4 shrink-0 text-primary/80" />
          {fullPeriod}
        </span>
      </div>

      <div className={cn('relative', loading && 'pointer-events-none opacity-70')}>
        <div
          className="hidden md:grid md:divide-x md:divide-border/80"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {funnel.stages.map((stage, i) => (
            <WorkflowColumn
              key={stage.id}
              stage={stage}
              index={i}
              totalStages={n}
              periodLabel={periodLabel}
              loading={loading}
            />
          ))}
        </div>

        <div className="divide-y divide-border md:hidden">
          <div className="border-b border-border bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 via-background/30 to-background/10 px-4 py-5">
            <FunnelBarFull stages={funnel.stages} />
            <div
              className="mt-3 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            >
              {funnel.stages.map((stage) => (
                <p
                  key={stage.id}
                  className="truncate text-center text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </p>
              ))}
            </div>
          </div>
          {funnel.stages.map((stage, i) => (
            <div key={stage.id}>
              <StageHeader stage={stage} periodLabel={periodLabel} />
              <StageBreakdown stage={stage} loading={loading} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
