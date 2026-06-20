'use client';

import { useMemo } from 'react';
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Calendar, Scale, ThumbsUp, TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TrustMetricsWeeklyTrend } from '@/types';

const ACCEPTANCE_COLOR = '#1d9bf0';
const CALIBRATION_COLOR = '#10b981';

function formatDelta(delta: number, unit = '') {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}${unit}`;
}

function DeltaBadge({ delta, unit = '', invert = false }: { delta: number; unit?: string; invert?: boolean }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted">
        <ArrowRight className="h-3 w-3" />
        Flat
      </span>
    );
  }

  const positive = delta > 0;
  const good = invert ? !positive : positive;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums',
      good
        ? 'border-green-900/40 bg-green-950/20 text-green-300'
        : 'border-red-900/35 bg-red-950/15 text-red-300',
    )}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatDelta(delta, unit)} vs prior week
    </span>
  );
}

function TrendKpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  delta,
  deltaUnit,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'primary' | 'success';
  delta?: number;
  deltaUnit?: string;
}) {
  const iconStyles = {
    default: 'bg-background/60 text-muted',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/15 text-green-300',
  };
  const valueStyles = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-green-400',
  };

  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
          <div className={cn('mt-1.5 text-2xl font-bold tabular-nums leading-none', valueStyles[tone])}>
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        <div className={cn('shrink-0 rounded-lg p-2', iconStyles[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta != null && (
        <div className="mt-2.5">
          <DeltaBadge delta={delta} unit={deltaUnit} />
        </div>
      )}
    </div>
  );
}

function TrendsTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as TrustMetricsWeeklyTrend;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur-sm">
      <div className="text-xs font-semibold text-foreground">{label || row.week_label}</div>
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCEPTANCE_COLOR }} />
            Acceptance
          </span>
          <span className="font-semibold tabular-nums text-primary">{row.acceptance_rate}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CALIBRATION_COLOR }} />
            Calibration
          </span>
          <span className="font-semibold tabular-nums text-green-400">{row.trust_calibration_score}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-1.5">
          <span className="text-muted">Decisions</span>
          <span className="font-medium tabular-nums">{row.decision_count}</span>
        </div>
      </div>
    </div>
  );
}

function SeriesLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCEPTANCE_COLOR }} />
        Acceptance rate
      </span>
      <span className="inline-flex items-center gap-2 rounded-full border border-green-900/35 bg-green-950/15 px-2.5 py-1 text-xs font-medium text-green-300">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CALIBRATION_COLOR }} />
        Calibration score
      </span>
    </div>
  );
}

export function TrustMetricsTrendsChart({ data }: { data: TrustMetricsWeeklyTrend[] }) {
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1];
    const previous = data.length >= 2 ? data[data.length - 2] : null;

    const avgAcceptance = data.reduce((sum, w) => sum + w.acceptance_rate, 0) / data.length;
    const avgCalibration = data.reduce((sum, w) => sum + w.trust_calibration_score, 0) / data.length;
    const totalDecisions = data.reduce((sum, w) => sum + w.decision_count, 0);

    const acceptanceDelta = previous ? latest.acceptance_rate - previous.acceptance_rate : undefined;
    const calibrationDelta = previous
      ? latest.trust_calibration_score - previous.trust_calibration_score
      : undefined;

    const calibrationTrend = calibrationDelta != null
      ? calibrationDelta > 0 ? 'up' : calibrationDelta < 0 ? 'down' : 'flat'
      : 'flat';

    return {
      latest,
      previous,
      avgAcceptance,
      avgCalibration,
      totalDecisions,
      acceptanceDelta,
      calibrationDelta,
      calibrationTrend,
      periodLabel: `${data[0].week_label} → ${latest.week_label}`,
    };
  }, [data]);

  if (!stats) return null;

  const { latest, avgAcceptance, avgCalibration, totalDecisions, acceptanceDelta, calibrationDelta } = stats;

  return (
    <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Weekly Trends</h3>
              <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                {data.length} week{data.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Acceptance rate and calibration score movement over time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted" />
          <span className="text-xs text-muted">{stats.periodLabel}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TrendKpi
          label="Latest acceptance"
          value={`${latest.acceptance_rate}%`}
          sub={`${avgAcceptance.toFixed(1)}% period avg`}
          icon={ThumbsUp}
          tone="primary"
          delta={acceptanceDelta}
          deltaUnit="%"
        />
        <TrendKpi
          label="Latest calibration"
          value={latest.trust_calibration_score}
          sub={`${avgCalibration.toFixed(1)} period avg`}
          icon={Scale}
          tone="success"
          delta={calibrationDelta}
        />
        <TrendKpi
          label="Latest week decisions"
          value={latest.decision_count}
          sub={`${totalDecisions} total in range`}
          icon={Activity}
        />
        <TrendKpi
          label="Calibration trend"
          value={
            stats.calibrationTrend === 'up'
              ? 'Improving'
              : stats.calibrationTrend === 'down'
                ? 'Declining'
                : 'Stable'
          }
          sub="Week-over-week direction"
          icon={TrendingUp}
          tone={stats.calibrationTrend === 'up' ? 'success' : 'default'}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-background/30 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SeriesLegend />
          <span className="text-[11px] text-muted">Both metrics scaled 0–100</span>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="trendsAcceptanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCEPTANCE_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={ACCEPTANCE_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendsCalibrationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CALIBRATION_COLOR} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CALIBRATION_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
            <XAxis
              dataKey="week_label"
              tick={{ fill: '#71767b', fontSize: 11 }}
              axisLine={{ stroke: '#2f3336' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#71767b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TrendsTooltip />} cursor={{ stroke: '#2f3336', strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="acceptance_rate"
              fill="url(#trendsAcceptanceFill)"
              stroke="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="trust_calibration_score"
              fill="url(#trendsCalibrationFill)"
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="acceptance_rate"
              name="Acceptance %"
              stroke={ACCEPTANCE_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: ACCEPTANCE_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ACCEPTANCE_COLOR, stroke: '#0f1419', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="trust_calibration_score"
              name="Calibration"
              stroke={CALIBRATION_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CALIBRATION_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: CALIBRATION_COLOR, stroke: '#0f1419', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-foreground">{avgAcceptance.toFixed(1)}%</span> avg acceptance
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{avgCalibration.toFixed(1)}</span> avg calibration
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{totalDecisions}</span> decisions tracked
          </span>
        </div>
        {calibrationDelta != null && (
          <DeltaBadge delta={calibrationDelta} />
        )}
      </div>
    </Card>
  );
}
