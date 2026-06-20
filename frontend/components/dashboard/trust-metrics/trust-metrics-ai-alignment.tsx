'use client';

import { useMemo } from 'react';
import {
  Brain, ChevronRight, MousePointerClick, Pencil, Scale, ThumbsUp, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ACTION_SEGMENTS = [
  { key: 'acceptance', label: 'Accepted', rateKey: 'ai_acceptance_rate' as const, color: '#10b981', chip: 'border-green-900/40 bg-green-950/20 text-green-300' },
  { key: 'modification', label: 'Modified', rateKey: 'ai_modification_rate' as const, color: '#f59e0b', chip: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200' },
  { key: 'rejection', label: 'Rejected', rateKey: 'ai_rejection_rate' as const, color: '#ef4444', chip: 'border-red-900/35 bg-red-950/15 text-red-300' },
  { key: 'escalated', label: 'Escalated', rateKey: 'ai_escalated_rate' as const, color: '#8b5cf6', chip: 'border-purple-900/35 bg-purple-950/15 text-purple-200' },
  { key: 'notUsed', label: 'Not used', rateKey: 'ai_not_used_rate' as const, color: '#71767b', chip: 'border-border bg-background/60 text-muted' },
];

type AlignmentMetrics = {
  ai_acceptance_rate: number;
  human_ai_agreement_rate: number;
  ai_modification_rate: number;
  ai_rejection_rate: number;
  ai_escalated_rate: number;
  ai_not_used_rate: number;
  override_count: number;
  decision_count?: number;
};

function getAlignmentHealth(agreement: number, acceptance: number, overrideCount: number) {
  if (agreement >= 75 && acceptance >= 70 && overrideCount === 0) {
    return { label: 'Strong alignment', tone: 'success' as const };
  }
  if (agreement >= 75 && acceptance >= 70) {
    return { label: 'Healthy', tone: 'success' as const };
  }
  if (agreement >= 60 || acceptance >= 60) {
    return { label: 'Moderate', tone: 'warn' as const };
  }
  if (agreement === 0 && acceptance === 0 && overrideCount === 0) {
    return { label: 'No data', tone: 'empty' as const };
  }
  return { label: 'Needs attention', tone: 'risk' as const };
}

const HEALTH_STYLES = {
  success: 'border-green-900/40 bg-green-950/20 text-green-300',
  warn: 'border-yellow-900/40 bg-yellow-950/15 text-yellow-200',
  risk: 'border-red-900/35 bg-red-950/15 text-red-300',
  empty: 'border-border bg-background/60 text-muted',
};

type MetricTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

function AlignmentMetric({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  barValue,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: MetricTone;
  barValue?: number;
  onClick?: () => void;
}) {
  const toneStyles: Record<MetricTone, { card: string; icon: string; value: string; bar: string }> = {
    default: {
      card: 'border-border/70 hover:border-border',
      icon: 'bg-background/60 text-muted',
      value: 'text-foreground',
      bar: 'bg-primary/70',
    },
    primary: {
      card: 'border-primary/30 hover:border-primary/45',
      icon: 'bg-primary/10 text-primary',
      value: 'text-primary',
      bar: 'bg-primary',
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
  };

  const styles = toneStyles[tone];
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
            style={{ width: `${Math.min(100, Math.max(0, barValue))}%` }}
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

function ActionMixBar({ metrics }: { metrics: AlignmentMetrics }) {
  const segments = useMemo(
    () => ACTION_SEGMENTS.map((seg) => ({
      ...seg,
      rate: metrics[seg.rateKey],
    })).filter((seg) => seg.rate > 0),
    [metrics],
  );

  const totalRate = segments.reduce((sum, seg) => sum + seg.rate, 0);

  if (totalRate === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/20 px-3 py-4 text-center text-xs text-muted">
        Action mix appears after analysts submit decisions on AI-assisted cases.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Analyst action mix</span>
        <span className="text-[11px] text-muted">Share of AI recommendation outcomes</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-border/80">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(seg.rate / totalRate) * 100}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${seg.rate}%`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTION_SEGMENTS.map((seg) => {
          const rate = metrics[seg.rateKey];
          if (rate <= 0) return null;
          return (
            <span
              key={seg.key}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                seg.chip,
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.label}
              <span className="tabular-nums">{rate}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TrustMetricsAiAlignment({
  metrics,
  onDrilldown,
}: {
  metrics: AlignmentMetrics;
  onDrilldown: (type: string) => void;
}) {
  const health = getAlignmentHealth(
    metrics.human_ai_agreement_rate,
    metrics.ai_acceptance_rate,
    metrics.override_count,
  );

  const alignedDecisions = metrics.decision_count
    ? Math.round((metrics.human_ai_agreement_rate / 100) * metrics.decision_count)
    : null;

  return (
    <Card className="mb-6 overflow-hidden border-violet-900/25 bg-gradient-to-br from-violet-950/12 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-violet-500/15 p-2 text-violet-300">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">AI Alignment</h3>
              <span className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                HEALTH_STYLES[health.tone],
              )}>
                {health.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              How analysts interact with AI triage recommendations in the selected range
            </p>
          </div>
        </div>
        {alignedDecisions != null && metrics.decision_count != null && metrics.decision_count > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
            <Scale className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">
              <span className="font-medium text-foreground">{alignedDecisions}</span>
              {' '}of{' '}
              <span className="font-medium text-foreground">{metrics.decision_count}</span>
              {' '}decisions aligned
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AlignmentMetric
          label="Acceptance rate"
          value={`${metrics.ai_acceptance_rate}%`}
          sub="Accepted AI recommendation as-is"
          icon={ThumbsUp}
          tone={metrics.ai_acceptance_rate >= 70 ? 'success' : metrics.ai_acceptance_rate >= 50 ? 'default' : 'warning'}
          barValue={metrics.ai_acceptance_rate}
        />
        <AlignmentMetric
          label="Human–AI agreement"
          value={`${metrics.human_ai_agreement_rate}%`}
          sub="Analyst decision matched AI output"
          icon={Scale}
          tone={metrics.human_ai_agreement_rate >= 75 ? 'success' : metrics.human_ai_agreement_rate >= 60 ? 'warning' : 'danger'}
          barValue={metrics.human_ai_agreement_rate}
          onClick={() => onDrilldown('human_ai_disagreement')}
        />
        <AlignmentMetric
          label="Modification rate"
          value={`${metrics.ai_modification_rate}%`}
          sub="Changed AI output before deciding"
          icon={Pencil}
          tone={metrics.ai_modification_rate > 25 ? 'warning' : 'default'}
          barValue={metrics.ai_modification_rate}
        />
        <AlignmentMetric
          label="Override count"
          value={metrics.override_count}
          sub={`${metrics.ai_rejection_rate}% rejected outright`}
          icon={XCircle}
          tone={metrics.override_count > 0 ? 'warning' : 'success'}
          onClick={() => onDrilldown('analyst_override')}
        />
      </div>

      <div className="mt-4 rounded-lg border border-border/70 bg-background/30 p-3.5">
        <ActionMixBar metrics={metrics} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-foreground">{metrics.ai_acceptance_rate}%</span> accepted
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{metrics.ai_modification_rate}%</span> modified
          </span>
          <span className="hidden sm:inline text-border">·</span>
          <span>
            <span className="font-medium text-foreground">{metrics.ai_rejection_rate}%</span> rejected
          </span>
          {metrics.ai_escalated_rate > 0 && (
            <>
              <span className="hidden sm:inline text-border">·</span>
              <span>
                <span className="font-medium text-foreground">{metrics.ai_escalated_rate}%</span> escalated
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDrilldown('human_ai_disagreement')}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            Disagreements
            <ChevronRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDrilldown('analyst_override')}
            className="inline-flex items-center gap-1 rounded-full border border-yellow-900/35 bg-yellow-950/15 px-2.5 py-1 text-[11px] font-medium text-yellow-200 transition-colors hover:bg-yellow-950/25"
          >
            Overrides
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}
