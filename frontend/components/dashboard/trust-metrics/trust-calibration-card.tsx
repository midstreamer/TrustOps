'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  Brain, CheckCircle2, ClipboardCheck, Info, Scale, Sparkles, Users,
} from 'lucide-react';

type ScoreTone = 'strong' | 'moderate' | 'developing' | 'empty';

function getScoreTone(score: number): ScoreTone {
  if (score === 0) return 'empty';
  if (score >= 80) return 'strong';
  if (score >= 60) return 'moderate';
  return 'developing';
}

const TONE_STYLES: Record<ScoreTone, {
  card: string;
  badge: string;
  ring: string;
  ringGlow: string;
  scoreText: string;
  label: string;
}> = {
  strong: {
    card: 'border-green-900/35 bg-gradient-to-br from-green-950/20 via-card to-card',
    badge: 'border-green-900/40 bg-green-950/25 text-green-300',
    ring: 'stroke-green-400',
    ringGlow: 'shadow-[0_0_24px_rgba(74,222,128,0.15)]',
    scoreText: 'text-green-400',
    label: 'Strong',
  },
  moderate: {
    card: 'border-yellow-900/35 bg-gradient-to-br from-yellow-950/15 via-card to-card',
    badge: 'border-yellow-900/40 bg-yellow-950/20 text-yellow-200',
    ring: 'stroke-yellow-400',
    ringGlow: 'shadow-[0_0_24px_rgba(250,204,21,0.12)]',
    scoreText: 'text-yellow-300',
    label: 'Moderate',
  },
  developing: {
    card: 'border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card',
    badge: 'border-primary/35 bg-primary/10 text-primary',
    ring: 'stroke-primary',
    ringGlow: 'shadow-[0_0_24px_rgba(29,155,240,0.12)]',
    scoreText: 'text-primary',
    label: 'Developing',
  },
  empty: {
    card: 'border-purple-900/20 bg-gradient-to-br from-purple-950/10 via-card to-card',
    badge: 'border-border bg-background/60 text-muted',
    ring: 'stroke-border',
    ringGlow: '',
    scoreText: 'text-muted',
    label: 'No data',
  },
};

const COMPONENTS = [
  {
    key: 'agreement_component' as const,
    label: 'Human–AI agreement',
    description: 'Analyst decisions aligned with AI recommendations',
    weight: 0.5,
    weightLabel: '50%',
    icon: Users,
    bar: 'bg-primary',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    key: 'high_confidence_alignment' as const,
    label: 'High-confidence alignment',
    description: 'Acceptance rate when AI confidence ≥ 80%',
    weight: 0.3,
    weightLabel: '30%',
    icon: Sparkles,
    bar: 'bg-purple-400',
    iconBg: 'bg-purple-500/15 text-purple-300',
  },
  {
    key: 'qa_validation_component' as const,
    label: 'QA validation',
    description: 'Manager-confirmed override appropriateness',
    weight: 0.2,
    weightLabel: '20%',
    icon: ClipboardCheck,
    bar: 'bg-green-400',
    iconBg: 'bg-green-500/15 text-green-300',
  },
];

function ScoreRing({ score, tone }: { score: number; tone: ScoreTone }) {
  const styles = TONE_STYLES[tone];
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn(
      'relative flex h-[148px] w-[148px] shrink-0 items-center justify-center rounded-full',
      styles.ringGlow,
    )}>
      <svg className="-rotate-90" width="148" height="148" viewBox="0 0 148 148" aria-hidden>
        <circle cx="74" cy="74" r={radius} fill="none" className="stroke-border/80" strokeWidth="9" />
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          className={cn('transition-all duration-700 ease-out', styles.ring)}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-4xl font-bold tabular-nums leading-none', styles.scoreText)}>
          {score}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted">/ 100</span>
      </div>
    </div>
  );
}

function ComponentRow({
  label,
  description,
  value,
  weight,
  weightLabel,
  contribution,
  icon: Icon,
  barClass,
  iconBg,
}: {
  label: string;
  description: string;
  value: number;
  weight: number;
  weightLabel: string;
  contribution: number;
  icon: React.ComponentType<{ className?: string }>;
  barClass: string;
  iconBg: string;
}) {
  const barTone = value >= 80 ? barClass : value >= 60 ? 'bg-yellow-400' : value > 0 ? 'bg-primary/70' : 'bg-border';

  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-border">
      <div className="flex items-start gap-3">
        <div className={cn('shrink-0 rounded-lg p-2', iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{label}</span>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted">
                {weightLabel} weight
              </span>
              <span className="text-sm font-bold tabular-nums">{value}%</span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border/80">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barTone)}
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
            <span>Weighted contribution</span>
            <span className="font-medium tabular-nums text-foreground">
              +{contribution.toFixed(1)} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrustCalibrationCard({
  score,
  definition,
  components,
  hasDecisions,
}: {
  score: number;
  definition: string;
  components?: {
    agreement_component: number;
    high_confidence_alignment: number;
    qa_validation_component: number;
  };
  hasDecisions: boolean;
}) {
  const tone = getScoreTone(score);
  const styles = TONE_STYLES[tone];

  return (
    <Card className={cn('mb-6 overflow-hidden', styles.card)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-purple-500/15 p-2 text-purple-300">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Trust Calibration Score</h3>
              <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-medium', styles.badge)}>
                {styles.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">Composite human–AI alignment indicator for pilot QBRs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/30 px-3 py-1.5">
          <Brain className="h-3.5 w-3.5 text-muted" />
          <span className="text-xs text-muted">Operational indicator — not a statistical certification</span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/30 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <Info className="h-3 w-3" />
              How it&apos;s calculated
            </div>
            <p className="text-sm leading-relaxed text-muted">{definition}</p>
          </div>

          {components && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Score components</span>
                <span className="text-[11px] tabular-nums text-muted">
                  50% + 30% + 20% = composite score
                </span>
              </div>
              <div className="grid gap-2.5">
                {COMPONENTS.map((comp) => (
                  <ComponentRow
                    key={comp.key}
                    label={comp.label}
                    description={comp.description}
                    value={components[comp.key]}
                    weight={comp.weight}
                    weightLabel={comp.weightLabel}
                    contribution={components[comp.key] * comp.weight}
                    icon={comp.icon}
                    barClass={comp.bar}
                    iconBg={comp.iconBg}
                  />
                ))}
              </div>
            </div>
          )}

          {!hasDecisions && (
            <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/40 px-3.5 py-3">
              <div className="rounded-full bg-background/80 p-1.5 text-muted">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Waiting for decision data</p>
                <p className="mt-0.5 text-xs text-muted">
                  Submit analyst decisions on cases to populate calibration components and compute a score.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 lg:min-w-[200px] lg:items-end lg:pr-2">
          <ScoreRing score={score} tone={tone} />
          {components && hasDecisions && (
            <div className="w-full max-w-[200px] space-y-1.5 rounded-lg border border-border/60 bg-background/30 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Composite</div>
              {COMPONENTS.map((comp) => (
                <div key={comp.key} className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted">{comp.weightLabel}</span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {(components[comp.key] * comp.weight).toFixed(1)}
                  </span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2 text-xs font-semibold">
                <span>Total</span>
                <span className={cn('tabular-nums', styles.scoreText)}>{score}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
