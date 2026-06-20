'use client';

import { useMemo } from 'react';
import {
  CheckCircle2, ChevronRight, ClipboardCheck, MousePointerClick, RotateCcw, ShieldCheck, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type QaMetrics = {
  qa_review_count: number;
  decision_reversal_rate_after_qa: number;
  qa_confirmed_override_accuracy: number;
  override_count?: number;
  decision_count?: number;
};

type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

function getQaHealth(metrics: QaMetrics) {
  if (metrics.qa_review_count === 0) {
    return { label: 'No QA activity', tone: 'empty' as const };
  }
  if (metrics.decision_reversal_rate_after_qa <= 15 && metrics.qa_confirmed_override_accuracy >= 80) {
    return { label: 'Strong oversight', tone: 'good' as const };
  }
  if (metrics.decision_reversal_rate_after_qa > 25) {
    return { label: 'High reversal rate', tone: 'risk' as const };
  }
  if (metrics.decision_reversal_rate_after_qa > 15 || metrics.qa_confirmed_override_accuracy < 80) {
    return { label: 'Needs review', tone: 'warn' as const };
  }
  return { label: 'On track', tone: 'good' as const };
}

const HEALTH_STYLES = {
  good: 'border-green-900/40 bg-green-950/20 text-green-300',
  warn: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
  risk: 'border-red-900/35 bg-red-950/15 text-red-300',
  empty: 'border-border bg-background/60 text-muted',
};

function QaMetric({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  barValue,
  barMax = 100,
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
      bar: 'bg-teal-400/70',
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
      card: 'border-teal-900/35 hover:border-teal-900/50',
      icon: 'bg-teal-500/15 text-teal-300',
      value: 'text-teal-300',
      bar: 'bg-teal-400',
    },
  };

  const styles = toneStyles[tone];
  const barWidth = barValue != null && barMax > 0
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
      {barValue != null && (
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

function QaOutcomePanel({
  reversalRate,
  overrideAccuracy,
}: {
  reversalRate: number;
  overrideAccuracy: number;
}) {
  const upheldRate = Math.max(0, 100 - reversalRate);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">QA outcome balance</span>
        <span className="text-[11px] text-muted">Lower reversals + higher override accuracy = healthier oversight</span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <ShieldCheck className="h-3 w-3 text-green-400" />
              Decisions upheld after QA
            </span>
            <span className="font-semibold tabular-nums text-green-400">{upheldRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-green-400 transition-all duration-500"
              style={{ width: `${upheldRate}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <RotateCcw className="h-3 w-3 text-red-300" />
              QA reversal rate
            </span>
            <span className={cn(
              'font-semibold tabular-nums',
              reversalRate > 15 ? 'text-red-300' : 'text-yellow-300',
            )}>
              {reversalRate}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                reversalRate > 15 ? 'bg-red-400' : 'bg-yellow-400',
              )}
              style={{ width: `${Math.min(100, reversalRate)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <CheckCircle2 className="h-3 w-3 text-teal-300" />
              Override accuracy (QA-confirmed)
            </span>
            <span className={cn(
              'font-semibold tabular-nums',
              overrideAccuracy >= 80 ? 'text-green-400' : 'text-yellow-300',
            )}>
              {overrideAccuracy}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                overrideAccuracy >= 80 ? 'bg-teal-400' : 'bg-yellow-400',
              )}
              style={{ width: `${Math.min(100, overrideAccuracy)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCoveragePanel({
  qaReviews,
  decisions,
  overrides,
}: {
  qaReviews: number;
  decisions: number;
  overrides: number;
}) {
  const coverage = useMemo(() => {
    if (decisions === 0 && qaReviews === 0) return null;
    const reviewCoverage = decisions > 0 ? Math.min(100, (qaReviews / decisions) * 100) : 0;
    const overrideShare = decisions > 0 ? Math.min(100, (overrides / decisions) * 100) : 0;
    return { reviewCoverage, overrideShare };
  }, [qaReviews, decisions, overrides]);

  if (!coverage) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/20 px-3 py-4 text-center text-xs text-muted">
        QA review coverage appears once managers complete quality reviews on cases in range.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Review coverage</span>
        <span className="text-[11px] tabular-nums text-muted">
          {qaReviews} review{qaReviews === 1 ? '' : 's'} across {decisions} decision{decisions === 1 ? '' : 's'}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">QA review coverage</span>
            <span className="font-semibold tabular-nums text-teal-300">{coverage.reviewCoverage.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-teal-400 transition-all duration-500"
              style={{ width: `${coverage.reviewCoverage}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">Cases with analyst overrides</span>
            <span className="font-semibold tabular-nums text-foreground">{overrides}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-yellow-400/80 transition-all duration-500"
              style={{ width: `${coverage.overrideShare}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-900/35 bg-teal-950/15 px-2.5 py-1 text-xs font-medium text-teal-300">
          <ClipboardCheck className="h-3 w-3" />
          {qaReviews} QA review{qaReviews === 1 ? '' : 's'}
        </span>
        {overrides > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-900/35 bg-yellow-950/15 px-2.5 py-1 text-xs font-medium text-yellow-200">
            {overrides} override{overrides === 1 ? '' : 's'} in scope
          </span>
        )}
      </div>
    </div>
  );
}

export function TrustMetricsQaOversight({
  metrics,
  onDrilldown,
}: {
  metrics: QaMetrics;
  onDrilldown: (type: string) => void;
}) {
  const health = getQaHealth(metrics);
  const decisions = metrics.decision_count ?? 0;
  const overrides = metrics.override_count ?? 0;
  const upheldRate = Math.max(0, 100 - metrics.decision_reversal_rate_after_qa);

  return (
    <Card className="mb-6 overflow-hidden border-teal-900/25 bg-gradient-to-br from-teal-950/12 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-teal-500/15 p-2 text-teal-300">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">QA Oversight</h3>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                HEALTH_STYLES[health.tone],
              )}>
                {health.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Manager quality review outcomes and override validation in the selected range
            </p>
          </div>
        </div>
        {metrics.qa_review_count > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">
              <span className="font-medium text-foreground">{upheldRate.toFixed(1)}%</span>
              {' '}of reviewed decisions upheld
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QaMetric
          label="QA reviews"
          value={metrics.qa_review_count}
          sub="Completed manager reviews"
          icon={ClipboardCheck}
          tone="info"
          barValue={metrics.qa_review_count}
          barMax={Math.max(metrics.qa_review_count, decisions, 1)}
        />
        <QaMetric
          label="Reversal rate"
          value={`${metrics.decision_reversal_rate_after_qa}%`}
          sub="Decisions reversed after QA"
          icon={XCircle}
          tone={metrics.decision_reversal_rate_after_qa > 15 ? 'danger' : metrics.decision_reversal_rate_after_qa > 0 ? 'warning' : 'success'}
          barValue={metrics.decision_reversal_rate_after_qa}
          onClick={() => onDrilldown('qa_reversed')}
        />
        <QaMetric
          label="Override accuracy"
          value={`${metrics.qa_confirmed_override_accuracy}%`}
          sub="QA-confirmed override appropriateness"
          icon={CheckCircle2}
          tone={metrics.qa_confirmed_override_accuracy >= 80 ? 'success' : metrics.qa_confirmed_override_accuracy > 0 ? 'warning' : 'default'}
          barValue={metrics.qa_confirmed_override_accuracy}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/30 p-3.5">
          <QaOutcomePanel
            reversalRate={metrics.decision_reversal_rate_after_qa}
            overrideAccuracy={metrics.qa_confirmed_override_accuracy}
          />
        </div>
        <div className="rounded-lg border border-border/70 bg-background/30 p-3.5">
          <ReviewCoveragePanel
            qaReviews={metrics.qa_review_count}
            decisions={decisions}
            overrides={overrides}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-foreground">{metrics.qa_review_count}</span> QA reviews
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{metrics.decision_reversal_rate_after_qa}%</span> reversal rate
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{metrics.qa_confirmed_override_accuracy}%</span> override accuracy
          </span>
          {decisions > 0 && (
            <>
              <span className="hidden sm:inline text-border">·</span>
              <span>
                <span className="font-medium text-foreground">{upheldRate.toFixed(1)}%</span> upheld
              </span>
            </>
          )}
        </div>
        {metrics.decision_reversal_rate_after_qa > 0 && (
          <button
            type="button"
            onClick={() => onDrilldown('qa_reversed')}
            className="inline-flex items-center gap-1 rounded-full border border-red-900/35 bg-red-950/15 px-2.5 py-1 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-950/25"
          >
            QA-reversed cases
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </Card>
  );
}
