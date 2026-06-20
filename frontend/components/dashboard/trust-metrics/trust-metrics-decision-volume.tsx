'use client';

import { useMemo } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Brain, CheckCircle2, Sparkles, Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type VolumeMetrics = {
  decision_count?: number;
  ai_recommendation_count: number;
  average_ai_confidence: number;
  average_analyst_confidence: number;
};

type MetricTone = 'default' | 'primary' | 'success' | 'warning' | 'info';

function getActivityLevel(decisions: number) {
  if (decisions === 0) return { label: 'No activity', tone: 'empty' as const };
  if (decisions >= 20) return { label: 'High volume', tone: 'active' as const };
  if (decisions >= 5) return { label: 'Moderate volume', tone: 'moderate' as const };
  return { label: 'Low volume', tone: 'low' as const };
}

const ACTIVITY_STYLES = {
  active: 'border-sky-900/40 bg-sky-950/20 text-sky-300',
  moderate: 'border-primary/35 bg-primary/10 text-primary',
  low: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
  empty: 'border-border bg-background/60 text-muted',
};

function VolumeMetric({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  barValue,
  barMax = 100,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: MetricTone;
  barValue?: number;
  barMax?: number;
}) {
  const toneStyles: Record<MetricTone, { card: string; icon: string; value: string; bar: string }> = {
    default: {
      card: 'border-border/70',
      icon: 'bg-background/60 text-muted',
      value: 'text-foreground',
      bar: 'bg-primary/70',
    },
    primary: {
      card: 'border-primary/30',
      icon: 'bg-primary/10 text-primary',
      value: 'text-primary',
      bar: 'bg-primary',
    },
    success: {
      card: 'border-green-900/35',
      icon: 'bg-green-500/15 text-green-300',
      value: 'text-green-400',
      bar: 'bg-green-400',
    },
    warning: {
      card: 'border-yellow-900/35',
      icon: 'bg-yellow-500/15 text-yellow-300',
      value: 'text-yellow-300',
      bar: 'bg-yellow-400',
    },
    info: {
      card: 'border-sky-900/35',
      icon: 'bg-sky-500/15 text-sky-300',
      value: 'text-sky-300',
      bar: 'bg-sky-400',
    },
  };

  const styles = toneStyles[tone];
  const barWidth = barValue != null && barMax > 0
    ? Math.min(100, Math.max(0, (barValue / barMax) * 100))
    : 0;

  return (
    <div className={cn('rounded-lg border bg-background/40 p-3', styles.card)}>
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
    </div>
  );
}

function ConfidenceCompare({
  aiConfidence,
  analystConfidence,
}: {
  aiConfidence: number;
  analystConfidence: number;
}) {
  const delta = analystConfidence - aiConfidence;
  const max = Math.max(aiConfidence, analystConfidence, 1);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Confidence comparison</span>
        {delta !== 0 ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums',
            delta > 0
              ? 'border-green-900/40 bg-green-950/20 text-green-300'
              : 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
          )}>
            {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            Analyst {delta > 0 ? '+' : ''}{delta.toFixed(1)} pts vs AI
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted">
            <ArrowRight className="h-3 w-3" />
            Matched confidence
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Brain className="h-3 w-3 text-primary" />
              AI model
            </span>
            <span className="font-semibold tabular-nums text-primary">{aiConfidence}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(aiConfidence / max) * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              Analyst self-reported
            </span>
            <span className="font-semibold tabular-nums text-green-400">{analystConfidence}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className="h-full rounded-full bg-green-400 transition-all duration-500"
              style={{ width: `${(analystConfidence / max) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VolumeRatioBar({
  decisions,
  recommendations,
}: {
  decisions: number;
  recommendations: number;
}) {
  const stats = useMemo(() => {
    if (recommendations === 0 && decisions === 0) {
      return { decisionShare: 0, recommendationShare: 0, coverage: 0 };
    }
    const total = Math.max(decisions + recommendations, 1);
    const decisionShare = (decisions / total) * 100;
    const recommendationShare = (recommendations / total) * 100;
    const coverage = recommendations > 0
      ? Math.min(100, (decisions / recommendations) * 100)
      : decisions > 0 ? 100 : 0;
    return { decisionShare, recommendationShare, coverage };
  }, [decisions, recommendations]);

  if (decisions === 0 && recommendations === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/20 px-3 py-4 text-center text-xs text-muted">
        Decision and recommendation counts appear once analysts work AI-assisted cases in range.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Activity mix</span>
        <span className="text-[11px] text-muted">
          <span className="font-medium text-foreground">{stats.coverage.toFixed(0)}%</span> decision-to-recommendation ratio
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${stats.decisionShare}%` }}
          title={`Analyst decisions: ${decisions}`}
        />
        <div
          className="h-full bg-sky-400/80 transition-all duration-500"
          style={{ width: `${stats.recommendationShare}%` }}
          title={`AI recommendations: ${recommendations}`}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Analyst decisions
          <span className="tabular-nums">{decisions}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-900/35 bg-sky-950/15 px-2.5 py-1 text-xs font-medium text-sky-300">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          AI recommendations
          <span className="tabular-nums">{recommendations}</span>
        </span>
      </div>
    </div>
  );
}

export function TrustMetricsDecisionVolume({ metrics }: { metrics: VolumeMetrics }) {
  const decisions = metrics.decision_count ?? 0;
  const recommendations = metrics.ai_recommendation_count;
  const activity = getActivityLevel(decisions);
  const confidenceDelta = metrics.average_analyst_confidence - metrics.average_ai_confidence;
  const maxVolume = Math.max(decisions, recommendations, 1);

  return (
    <Card className="mb-6 overflow-hidden border-sky-900/25 bg-gradient-to-br from-sky-950/12 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-sky-500/15 p-2 text-sky-300">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Decision Volume</h3>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                ACTIVITY_STYLES[activity.tone],
              )}>
                {activity.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Analyst decisions and AI recommendation activity in the selected range
            </p>
          </div>
        </div>
        {decisions > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">
              <span className="font-medium text-foreground">{recommendations}</span>
              {' '}AI rec{recommendations === 1 ? '' : 's'} for{' '}
              <span className="font-medium text-foreground">{decisions}</span>
              {' '}decision{decisions === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <VolumeMetric
          label="Analyst decisions"
          value={metrics.decision_count ?? '—'}
          sub="Submitted in selected range"
          icon={Users}
          tone="primary"
          barValue={decisions}
          barMax={maxVolume}
        />
        <VolumeMetric
          label="AI recommendations"
          value={recommendations}
          sub="Generated for cases in range"
          icon={Sparkles}
          tone="info"
          barValue={recommendations}
          barMax={maxVolume}
        />
        <VolumeMetric
          label="Avg AI confidence"
          value={`${metrics.average_ai_confidence}%`}
          sub="Model output score"
          icon={Brain}
          tone="default"
          barValue={metrics.average_ai_confidence}
        />
        <VolumeMetric
          label="Avg analyst confidence"
          value={`${metrics.average_analyst_confidence}%`}
          sub="Self-reported at decision time"
          icon={CheckCircle2}
          tone={confidenceDelta >= 0 ? 'success' : 'warning'}
          barValue={metrics.average_analyst_confidence}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-background/30 p-3.5">
          <VolumeRatioBar decisions={decisions} recommendations={recommendations} />
        </div>
        <div className="rounded-lg border border-border/70 bg-background/30 p-3.5">
          <ConfidenceCompare
            aiConfidence={metrics.average_ai_confidence}
            analystConfidence={metrics.average_analyst_confidence}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-foreground">{decisions}</span> decisions
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{recommendations}</span> AI recommendations
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            AI confidence{' '}
            <span className="font-medium text-foreground">{metrics.average_ai_confidence}%</span>
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            Analyst confidence{' '}
            <span className="font-medium text-foreground">{metrics.average_analyst_confidence}%</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
