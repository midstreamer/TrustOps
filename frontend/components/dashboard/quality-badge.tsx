'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CaseQuality } from '@/types';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, FileText, MessageSquare,
  Scale, Shield, Sparkles, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const GRADE_STYLES: Record<string, { badge: string; card: string; ring: string; text: string }> = {
  Excellent: {
    badge: 'bg-green-900/40 text-green-300 border-green-800/50',
    card: 'border-green-900/35 bg-green-950/20',
    ring: 'stroke-green-400',
    text: 'text-green-400',
  },
  Good: {
    badge: 'bg-primary/15 text-primary border-primary/30',
    card: 'border-primary/25 bg-primary/5',
    ring: 'stroke-primary',
    text: 'text-primary',
  },
  'Needs Attention': {
    badge: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
    card: 'border-yellow-900/35 bg-yellow-950/15',
    ring: 'stroke-yellow-400',
    text: 'text-yellow-300',
  },
  Poor: {
    badge: 'bg-red-900/40 text-red-300 border-red-800/50',
    card: 'border-red-900/35 bg-red-950/15',
    ring: 'stroke-red-400',
    text: 'text-red-400',
  },
};

const BREAKDOWN_META: Record<string, { label: string; max: number; icon: React.ComponentType<{ className?: string }> }> = {
  evidence_completeness: { label: 'Evidence completeness', max: 20, icon: FileText },
  analyst_decision_present: { label: 'Analyst decision', max: 20, icon: Target },
  sla_compliance: { label: 'SLA compliance', max: 20, icon: Shield },
  closure_completeness: { label: 'Closure summary', max: 15, icon: CheckCircle2 },
  qa_score_contribution: { label: 'QA review score', max: 15, icon: ClipboardCheck },
  client_communication: { label: 'Client communication', max: 10, icon: MessageSquare },
};

const FLAG_STYLES: Record<string, { tone: 'danger' | 'warning' | 'info'; icon: React.ComponentType<{ className?: string }> }> = {
  'Missing evidence': { tone: 'warning', icon: FileText },
  'No analyst decision': { tone: 'warning', icon: Target },
  'Override reason missing': { tone: 'warning', icon: Sparkles },
  'SLA breached': { tone: 'danger', icon: Shield },
  'No closure summary': { tone: 'info', icon: CheckCircle2 },
  'Client notification needed but not completed': { tone: 'warning', icon: MessageSquare },
  'Human-AI disagreement': { tone: 'warning', icon: Scale },
  'Low analyst confidence': { tone: 'warning', icon: AlertTriangle },
  'QA review recommended': { tone: 'info', icon: ClipboardCheck },
};

const FLAG_TONE_CLASS = {
  danger: 'border-red-900/40 bg-red-950/30 text-red-200',
  warning: 'border-yellow-900/40 bg-yellow-950/25 text-yellow-100',
  info: 'border-border bg-background/80 text-muted',
};

function gradeStyle(grade: string) {
  return GRADE_STYLES[grade] || GRADE_STYLES.Good;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const style = gradeStyle(grade);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="88" height="88" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={radius} fill="none" className="stroke-border" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          className={cn('transition-all duration-500', style.ring)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold tabular-nums leading-none', style.text)}>{score}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">/ 100</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value, max, icon: Icon }: { label: string; value: number; max: number; icon: React.ComponentType<{ className?: string }> }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const complete = value >= max;
  const partial = value > 0 && value < max;

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="truncate text-xs text-foreground">{label}</span>
        </div>
        <span className={cn(
          'shrink-0 text-xs font-semibold tabular-nums',
          complete && 'text-green-400',
          partial && 'text-yellow-300',
          !value && 'text-muted',
        )}>
          {value}<span className="font-normal text-muted">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            complete && 'bg-green-500/80',
            partial && 'bg-yellow-500/80',
            !value && 'bg-muted/40',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function QualityBadge({ quality, compact }: { quality: CaseQuality; compact?: boolean }) {
  const style = gradeStyle(quality.quality_grade);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        style.badge,
        compact && 'px-1.5',
      )}
      title={quality.flags.join(', ') || undefined}
    >
      {quality.quality_score}
      {!compact && <span className="ml-1 opacity-80">{quality.quality_grade}</span>}
    </span>
  );
}

export function QualityCard({
  quality,
  caseId,
  showQaLink = true,
}: {
  quality: CaseQuality;
  caseId?: string;
  showQaLink?: boolean;
}) {
  const style = gradeStyle(quality.quality_grade);
  const needsQa = quality.flags.includes('QA review recommended');
  const openFlags = quality.flags.filter((f) => f !== 'QA review recommended');

  return (
    <section
      className={cn('rounded-xl border p-4 sm:p-5', style.card)}
      aria-label="Case quality score"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <ScoreRing score={quality.quality_score} grade={quality.quality_grade} />
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Case Quality</h3>
              <QualityBadge quality={quality} compact />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Operational readiness score for managers and QA — evidence, decisions, SLA, closure, and communication.
            </p>
            {needsQa && showQaLink && caseId && (
              <Link href={`/app/cases/${caseId}/qa`} className="mt-3 inline-block">
                <Button size="sm" variant="secondary">
                  <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                  Open QA Review
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          {Object.entries(quality.score_breakdown).map(([key, value]) => {
            const meta = BREAKDOWN_META[key] || { label: key.replace(/_/g, ' '), max: 20, icon: Target };
            return (
              <BreakdownBar
                key={key}
                label={meta.label}
                value={value}
                max={meta.max}
                icon={meta.icon}
              />
            );
          })}
        </div>
      </div>

      {openFlags.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Attention items</p>
          <ul className="flex flex-wrap gap-2">
            {openFlags.map((flag) => {
              const meta = FLAG_STYLES[flag] || { tone: 'info' as const, icon: AlertTriangle };
              const Icon = meta.icon;
              return (
                <li
                  key={flag}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
                    FLAG_TONE_CLASS[meta.tone],
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  {flag}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {quality.flags.length === 0 && quality.quality_score >= 90 && (
        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Case meets quality standards — ready for closure or QA sign-off.
        </div>
      )}
    </section>
  );
}
