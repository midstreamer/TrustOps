'use client';

import { cn } from '@/lib/utils';
import type { AIRecommendation, AnalystDecision } from '@/types';
import { Card } from '@/components/ui/card';
import {
  AiActionBadge, AiConfidenceBadge, AgreementBadge, PanelHeader, PriorityBadge,
} from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import {
  AlertCircle, ArrowRight, Bot, Brain, CheckCircle2, ClipboardList, ListChecks,
  Scale, Shield, Sparkles, UserRound,
} from 'lucide-react';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ConfidenceRing({ score }: { score: number | null }) {
  if (score == null) return null;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = score >= 80 ? 'stroke-blue-400' : score >= 60 ? 'stroke-yellow-400' : 'stroke-orange-400';

  return (
    <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="68" height="68" viewBox="0 0 68 68" aria-hidden>
        <circle cx="34" cy="34" r={radius} fill="none" className="stroke-border" strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          className={cn('transition-all duration-500', tone)}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-blue-200">{score}</span>
        <span className="text-[9px] uppercase text-muted">conf.</span>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  icon: Icon,
  children,
  variant = 'default',
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}) {
  return (
    <section
      className={cn(
        'rounded-lg border px-3 py-2.5',
        variant === 'warning'
          ? 'border-yellow-900/35 bg-yellow-950/20'
          : 'border-border/60 bg-background/40',
      )}
    >
      <h5 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0 text-blue-300/80" />
        {title}
      </h5>
      {children}
    </section>
  );
}

function BulletList({ items, ordered }: { items: string[]; ordered?: boolean }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted">—</p>;
  }
  const ListTag = ordered ? 'ol' : 'ul';
  return (
    <ListTag className={cn('space-y-1.5 text-sm leading-relaxed text-foreground/90', ordered ? 'list-decimal pl-4' : 'list-none')}>
      {items.map((item, i) => (
        <li key={i} className={ordered ? 'pl-1' : 'flex gap-2'}>
          {!ordered && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400/70" />}
          <span>{item}</span>
        </li>
      ))}
    </ListTag>
  );
}

export function AiTriageAssistantCard({
  recommendation,
  aiLoading,
  onGenerate,
}: {
  recommendation: AIRecommendation | null | undefined;
  aiLoading: boolean;
  onGenerate: () => void;
}) {
  const keyEvidence = recommendation?.key_evidence_json?.items || [];
  const nextSteps = recommendation?.suggested_next_steps_json?.items || [];
  const tactics = recommendation?.mitre_tactics_json?.items || [];
  const techniques = recommendation?.mitre_techniques_json?.items || [];
  const limitations = recommendation?.limitations_json?.items || [];

  return (
    <Card className="overflow-hidden border-blue-900/35 bg-gradient-to-b from-blue-950/25 to-card">
      <PanelHeader
        title="AI Triage Assistant"
        subtitle="Recommendation only — not a final decision"
        action={
          <Button size="sm" onClick={onGenerate} disabled={aiLoading}>
            <Sparkles className="mr-1 h-4 w-4" />
            {aiLoading ? 'Generating...' : recommendation ? 'Regenerate' : 'Generate'}
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-900/30 bg-blue-950/20 px-3 py-2 text-xs text-blue-100/90">
        <Brain className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
        <p>AI assists triage — analysts retain final authority. Recommendations are logged for trust metrics and QA.</p>
      </div>

      {!recommendation ? (
        <EmptyState
          title="No AI recommendation yet"
          description="Generate a triage recommendation to summarize the alert, suggest disposition, and propose next steps."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-lg border border-blue-900/25 bg-background/30 p-3">
            <ConfidenceRing score={recommendation.confidence_score} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Recommended triage</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommendation.recommended_disposition && (
                  <span className="rounded-md border border-blue-800/40 bg-blue-950/30 px-2.5 py-1 text-xs font-medium text-blue-100">
                    {recommendation.recommended_disposition}
                  </span>
                )}
                <PriorityBadge priority={recommendation.recommended_priority} />
                <AiConfidenceBadge score={recommendation.confidence_score} />
              </div>
              <p className="mt-2 text-[10px] text-muted">Generated {formatTime(recommendation.created_at)}</p>
            </div>
          </div>

          <SectionBlock title="Summary" icon={ClipboardList}>
            <p className="text-sm leading-relaxed text-foreground/90">{recommendation.summary}</p>
          </SectionBlock>

          {keyEvidence.length > 0 && (
            <SectionBlock title="Key evidence" icon={ListChecks}>
              <BulletList items={keyEvidence} />
            </SectionBlock>
          )}

          {recommendation.rationale && (
            <SectionBlock title="Rationale" icon={Scale}>
              <p className="text-sm leading-relaxed text-foreground/90">{recommendation.rationale}</p>
            </SectionBlock>
          )}

          {nextSteps.length > 0 && (
            <SectionBlock title="Suggested next steps" icon={ArrowRight}>
              <BulletList items={nextSteps} ordered />
            </SectionBlock>
          )}

          {(tactics.length > 0 || techniques.length > 0) && (
            <div className="rounded-lg border border-purple-900/30 bg-purple-950/15 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200/80">
                <Shield className="h-3.5 w-3.5" />
                MITRE mapping
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-muted">Tactics</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tactics.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : tactics.map((t) => (
                      <span key={t} className="rounded border border-purple-800/40 bg-background/40 px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Techniques</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {techniques.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : techniques.map((t) => (
                      <span key={t} className="rounded border border-purple-800/40 bg-background/40 px-2 py-0.5 font-mono text-[11px]">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {limitations.length > 0 && (
            <SectionBlock title="Limitations" icon={AlertCircle} variant="warning">
              <ul className="space-y-1 text-xs leading-relaxed text-yellow-100/90">
                {limitations.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-yellow-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </SectionBlock>
          )}
        </div>
      )}
    </Card>
  );
}

export function HumanAiComparisonCard({
  recommendation,
  decision,
}: {
  recommendation: AIRecommendation;
  decision: AnalystDecision;
}) {
  const dispositionMatch = recommendation.recommended_disposition === decision.selected_disposition;
  const priorityMatch = recommendation.recommended_priority === decision.selected_priority;
  const agreed = decision.human_ai_agreement === true;

  return (
    <Card
      className={cn(
        'overflow-hidden',
        agreed ? 'border-green-900/35 bg-green-950/10' : 'border-yellow-900/35 bg-yellow-950/10',
      )}
    >
      <PanelHeader
        title="Human–AI Comparison"
        subtitle={agreed ? 'Analyst aligned with AI recommendation' : 'Analyst modified or overrode AI recommendation'}
        action={
          <div className="flex gap-1.5">
            <AgreementBadge agreed={decision.human_ai_agreement} />
            <AiActionBadge action={decision.ai_action} />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-900/30 bg-blue-950/15 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200/80">
            <Bot className="h-3.5 w-3.5" />
            AI recommended
          </div>
          <p className="text-sm font-medium">{recommendation.recommended_disposition || '—'}</p>
          <p className="mt-0.5 text-xs text-muted">{recommendation.recommended_priority || '—'}</p>
          <div className="mt-2">
            <AiConfidenceBadge score={recommendation.confidence_score} />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            <UserRound className="h-3.5 w-3.5" />
            Analyst selected
          </div>
          <p className={cn('text-sm font-medium', !dispositionMatch && 'text-yellow-200')}>
            {decision.selected_disposition}
          </p>
          <p className={cn('mt-0.5 text-xs', priorityMatch ? 'text-muted' : 'text-yellow-200/90')}>
            {decision.selected_priority}
          </p>
          <div className="mt-2">
            <AiConfidenceBadge score={decision.analyst_confidence} />
          </div>
        </div>
      </div>

      {!agreed && decision.override_reason && (
        <div className="mt-3 rounded-lg border border-yellow-900/30 bg-background/40 px-3 py-2 text-xs">
          <span className="font-medium text-yellow-200">Override reason: </span>
          <span className="text-muted">{decision.override_reason}</span>
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted">
        Recorded {formatTime(decision.created_at)} · Human decision is authoritative for case disposition
      </p>
    </Card>
  );
}
