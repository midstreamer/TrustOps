'use client';

import { useMemo } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, MousePointerClick, Sparkles, TrendingUp, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ConfidenceMetrics = {
  ai_high_confidence_accepted: number;
  ai_high_confidence_rejected: number;
  ai_low_confidence_accepted: number;
  analyst_low_confidence_escalations: number;
  decision_count?: number;
};

type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

function getSignalHealth(metrics: ConfidenceMetrics) {
  const total = metrics.ai_high_confidence_accepted
    + metrics.ai_high_confidence_rejected
    + metrics.ai_low_confidence_accepted
    + metrics.analyst_low_confidence_escalations;

  if (total === 0) return { label: 'No signals', tone: 'empty' as const };
  if (metrics.ai_high_confidence_rejected === 0 && metrics.analyst_low_confidence_escalations === 0) {
    return { label: 'Clean signals', tone: 'good' as const };
  }
  if (metrics.ai_high_confidence_rejected > 0 && metrics.analyst_low_confidence_escalations > 0) {
    return { label: 'Mixed risk', tone: 'risk' as const };
  }
  if (metrics.ai_high_confidence_rejected > 0) {
    return { label: 'High-conf overrides', tone: 'warn' as const };
  }
  return { label: 'Analyst uncertainty', tone: 'warn' as const };
}

const HEALTH_STYLES = {
  good: 'border-green-900/40 bg-green-950/20 text-green-300',
  warn: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
  risk: 'border-red-900/35 bg-red-950/15 text-red-300',
  empty: 'border-border bg-background/60 text-muted',
};

function SignalMetric({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  barValue,
  barMax,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: MetricTone;
  barValue?: number;
  barMax?: number;
  onClick?: () => void;
}) {
  const toneStyles: Record<MetricTone, { card: string; icon: string; value: string; bar: string }> = {
    default: {
      card: 'border-border/70 hover:border-border',
      icon: 'bg-background/60 text-muted',
      value: 'text-foreground',
      bar: 'bg-primary/70',
    },
    success: {
      card: 'border-green-900/35 hover:border-green-900/50',
      icon: 'bg-green-500/15 text-green-300',
      value: 'text-green-400',
      bar: 'bg-green-400',
    },
    warning: {
      card: 'border-yellow-900/35 hover:border-yellow-900/50',
      icon: 'bg-yellow-500/15 text-yellow-300',
      value: 'text-yellow-300',
      bar: 'bg-yellow-400',
    },
    danger: {
      card: 'border-red-900/35 hover:border-red-900/50',
      icon: 'bg-red-500/15 text-red-300',
      value: 'text-red-300',
      bar: 'bg-red-400',
    },
    info: {
      card: 'border-amber-900/35 hover:border-amber-900/50',
      icon: 'bg-amber-500/15 text-amber-300',
      value: 'text-amber-300',
      bar: 'bg-amber-400',
    },
  };

  const styles = toneStyles[tone];
  const barWidth = barValue != null && barMax != null && barMax > 0
    ? Math.min(100, Math.max(0, (barValue / barMax) * 100))
    : 0;

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border bg-background/40 p-3 text-left transition-colors',
        styles.card,
        onClick && 'cursor-pointer hover:bg-background/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
          <div className={cn('mt-1.5 text-2xl font-bold tabular-nums leading-none', styles.value)}>
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        <div className={cn('shrink-0 rounded-lg p-2', styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {barValue != null && barMax != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/80">
          <div
            className={cn('h-full rounded-full transition-all duration-500', styles.bar)}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
      {onClick && (
        <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
          <MousePointerClick className="h-3 w-3" />
          View drill-down
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </Wrapper>
  );
}

function SignalSpectrum({ metrics }: { metrics: ConfidenceMetrics }) {
  const bands = useMemo(() => {
    const highTotal = metrics.ai_high_confidence_accepted + metrics.ai_high_confidence_rejected;
    const lowTotal = metrics.ai_low_confidence_accepted + metrics.analyst_low_confidence_escalations;
    const highAcceptShare = highTotal > 0
      ? (metrics.ai_high_confidence_accepted / highTotal) * 100
      : 0;
    const lowAcceptShare = lowTotal > 0
      ? (metrics.ai_low_confidence_accepted / lowTotal) * 100
      : 0;
    return { highTotal, lowTotal, highAcceptShare, lowAcceptShare };
  }, [metrics]);

  if (bands.highTotal === 0 && bands.lowTotal === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/20 px-3 py-4 text-center text-xs text-muted">
        Confidence signal patterns appear when analysts decide on AI-assisted cases at varying confidence levels.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AI ≥ 80% confidence</span>
          <span className="text-[11px] tabular-nums text-muted">{bands.highTotal} cases</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {metrics.ai_high_confidence_accepted > 0 && (
            <div
              className="h-full bg-green-400 transition-all duration-500"
              style={{ width: `${bands.highAcceptShare}%` }}
              title={`Accepted: ${metrics.ai_high_confidence_accepted}`}
            />
          )}
          {metrics.ai_high_confidence_rejected > 0 && (
            <div
              className="h-full bg-red-400 transition-all duration-500"
              style={{ width: `${100 - bands.highAcceptShare}%` }}
              title={`Rejected: ${metrics.ai_high_confidence_rejected}`}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-900/40 bg-green-950/20 px-2 py-0.5 text-[11px] font-medium text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Accepted {metrics.ai_high_confidence_accepted}
          </span>
          {metrics.ai_high_confidence_rejected > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-900/35 bg-red-950/15 px-2 py-0.5 text-[11px] font-medium text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              Rejected {metrics.ai_high_confidence_rejected}
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">AI &lt; 80% confidence</span>
          <span className="text-[11px] tabular-nums text-muted">{bands.lowTotal} cases</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
          {metrics.ai_low_confidence_accepted > 0 && (
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${bands.lowAcceptShare}%` }}
              title={`Accepted: ${metrics.ai_low_confidence_accepted}`}
            />
          )}
          {metrics.analyst_low_confidence_escalations > 0 && (
            <div
              className="h-full bg-purple-400 transition-all duration-500"
              style={{ width: `${100 - bands.lowAcceptShare}%` }}
              title={`Escalated: ${metrics.analyst_low_confidence_escalations}`}
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/35 bg-amber-950/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Accepted {metrics.ai_low_confidence_accepted}
          </span>
          {metrics.analyst_low_confidence_escalations > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-900/35 bg-purple-950/15 px-2 py-0.5 text-[11px] font-medium text-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Escalated {metrics.analyst_low_confidence_escalations}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TrustMetricsConfidenceSignals({
  metrics,
  onDrilldown,
}: {
  metrics: ConfidenceMetrics;
  onDrilldown: (type: string) => void;
}) {
  const health = getSignalHealth(metrics);
  const maxSignal = Math.max(
    metrics.ai_high_confidence_accepted,
    metrics.ai_high_confidence_rejected,
    metrics.ai_low_confidence_accepted,
    metrics.analyst_low_confidence_escalations,
    1,
  );
  const totalSignals = metrics.ai_high_confidence_accepted
    + metrics.ai_high_confidence_rejected
    + metrics.ai_low_confidence_accepted
    + metrics.analyst_low_confidence_escalations;
  const highConfRejectRate = (metrics.ai_high_confidence_accepted + metrics.ai_high_confidence_rejected) > 0
    ? Math.round(
      (metrics.ai_high_confidence_rejected
        / (metrics.ai_high_confidence_accepted + metrics.ai_high_confidence_rejected))
      * 100,
    )
    : 0;

  return (
    <Card className="mb-6 overflow-hidden border-amber-900/25 bg-gradient-to-br from-amber-950/12 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-amber-500/15 p-2 text-amber-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Confidence Signals</h3>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                HEALTH_STYLES[health.tone],
              )}>
                {health.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              High- and low-confidence decision patterns across AI-assisted cases
            </p>
          </div>
        </div>
        {totalSignals > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">
              <span className="font-medium text-foreground">{totalSignals}</span>
              {' '}confidence signal{totalSignals === 1 ? '' : 's'} in range
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SignalMetric
          label="High-conf accepted"
          value={metrics.ai_high_confidence_accepted}
          sub="AI ≥80% and accepted as-is"
          icon={CheckCircle2}
          tone="success"
          barValue={metrics.ai_high_confidence_accepted}
          barMax={maxSignal}
        />
        <SignalMetric
          label="High-conf rejected"
          value={metrics.ai_high_confidence_rejected}
          sub="AI ≥80% but overridden"
          icon={XCircle}
          tone={metrics.ai_high_confidence_rejected > 0 ? 'danger' : 'default'}
          barValue={metrics.ai_high_confidence_rejected}
          barMax={maxSignal}
          onClick={() => onDrilldown('high_confidence_ai_rejected')}
        />
        <SignalMetric
          label="Low-conf accepted"
          value={metrics.ai_low_confidence_accepted}
          sub="AI &lt;80% but still accepted"
          icon={Sparkles}
          tone="info"
          barValue={metrics.ai_low_confidence_accepted}
          barMax={maxSignal}
          onClick={() => onDrilldown('low_confidence_ai_accepted')}
        />
        <SignalMetric
          label="Low-conf escalations"
          value={metrics.analyst_low_confidence_escalations}
          sub="Analyst uncertainty escalations"
          icon={TrendingUp}
          tone={metrics.analyst_low_confidence_escalations > 0 ? 'warning' : 'default'}
          barValue={metrics.analyst_low_confidence_escalations}
          barMax={maxSignal}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-background/30 p-3.5">
        <SignalSpectrum metrics={metrics} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-green-400">{metrics.ai_high_confidence_accepted}</span> high-conf accepted
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-red-300">{metrics.ai_high_confidence_rejected}</span> high-conf rejected
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-amber-300">{metrics.ai_low_confidence_accepted}</span> low-conf accepted
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-purple-300">{metrics.analyst_low_confidence_escalations}</span> escalations
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {metrics.ai_high_confidence_rejected > 0 && (
            <button
              type="button"
              onClick={() => onDrilldown('high_confidence_ai_rejected')}
              className="inline-flex items-center gap-1 rounded-full border border-red-900/35 bg-red-950/15 px-2.5 py-1 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-950/25"
            >
              High-conf rejects ({highConfRejectRate}%)
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
          {metrics.ai_low_confidence_accepted > 0 && (
            <button
              type="button"
              onClick={() => onDrilldown('low_confidence_ai_accepted')}
              className="inline-flex items-center gap-1 rounded-full border border-amber-900/35 bg-amber-950/15 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-950/25"
            >
              Low-conf accepts
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
