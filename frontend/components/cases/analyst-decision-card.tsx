'use client';

import { cn } from '@/lib/utils';
import type { AIRecommendation, AnalystDecision } from '@/types';
import { Card } from '@/components/ui/card';
import {
  AiActionBadge, AiConfidenceBadge, AgreementBadge, PanelHeader, PriorityBadge,
} from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { AI_ACTIONS, DISPOSITIONS, PRIORITIES } from '@/lib/utils';
import {
  Bell, Gavel, Scale, Shield, Sparkles, TrendingUp,
} from 'lucide-react';

export type AnalystDecisionForm = {
  selected_disposition: string;
  selected_priority: string;
  analyst_confidence: number;
  ai_action: string;
  override_reason: string;
  escalation_needed: boolean;
  client_notification_needed: boolean;
  decision_notes: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const tone = value >= 80 ? 'bg-green-500/80' : value >= 60 ? 'bg-yellow-500/80' : 'bg-orange-500/80';
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted">Analyst confidence</span>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          value >= 80 ? 'text-green-400' : value >= 60 ? 'text-yellow-300' : 'text-orange-300',
        )}>
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        className="w-full accent-primary"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const AI_ACTION_STYLES: Record<string, string> = {
  Accepted: 'border-green-900/40 bg-green-950/25 text-green-200 hover:bg-green-950/40',
  Modified: 'border-yellow-900/40 bg-yellow-950/20 text-yellow-100 hover:bg-yellow-950/35',
  Rejected: 'border-red-900/40 bg-red-950/20 text-red-200 hover:bg-red-950/35',
  Escalated: 'border-orange-900/40 bg-orange-950/20 text-orange-200 hover:bg-orange-950/35',
  'Not Used': 'border-border bg-background/60 text-muted hover:bg-background',
};

function ToggleOption({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  tone = 'default',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'warning';
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex flex-1 items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors',
        checked
          ? tone === 'warning'
            ? 'border-yellow-700/50 bg-yellow-950/25'
            : 'border-primary/40 bg-primary/10'
          : 'border-border/60 bg-background/40 hover:border-border',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', checked ? 'text-primary' : 'text-muted')} />
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted">{description}</div>
      </div>
      <div className={cn(
        'ml-auto mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2',
        checked ? 'border-primary bg-primary' : 'border-muted-foreground/40',
      )} />
    </button>
  );
}

export function AnalystDecisionCard({
  form,
  onFormChange,
  latestDecision,
  aiRecommendation,
  onSubmit,
  submitting,
}: {
  form: AnalystDecisionForm;
  onFormChange: (patch: Partial<AnalystDecisionForm>) => void;
  latestDecision: AnalystDecision | null | undefined;
  aiRecommendation?: AIRecommendation | null;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
}) {
  const needsOverride = ['Modified', 'Rejected'].includes(form.ai_action);
  const showAiHint = aiRecommendation && (
    aiRecommendation.recommended_disposition !== form.selected_disposition
    || aiRecommendation.recommended_priority !== form.selected_priority
  );

  const applyAiRecommendation = () => {
    if (!aiRecommendation) return;
    onFormChange({
      selected_disposition: aiRecommendation.recommended_disposition || form.selected_disposition,
      selected_priority: aiRecommendation.recommended_priority || form.selected_priority,
      ai_action: 'Accepted',
    });
  };

  return (
    <Card className="overflow-hidden border-primary/35 bg-gradient-to-b from-primary/8 to-card">
      <PanelHeader
        title="Analyst Decision"
        subtitle="Human decision — final authority"
        action={<Gavel className="h-5 w-5 text-primary/70" />}
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground/90">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Your disposition is authoritative. Decisions are audited, compared to AI recommendations, and reflected in trust metrics.</p>
      </div>

      {latestDecision && (
        <div className="mb-4 rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Last recorded decision</p>
            <time className="text-[10px] text-muted">{formatTime(latestDecision.created_at)}</time>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
              {latestDecision.selected_disposition}
            </span>
            <PriorityBadge priority={latestDecision.selected_priority} />
            <AgreementBadge agreed={latestDecision.human_ai_agreement} />
            <AiActionBadge action={latestDecision.ai_action} />
            <AiConfidenceBadge score={latestDecision.analyst_confidence} />
          </div>
        </div>
      )}

      {aiRecommendation && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-900/25 bg-blue-950/15 px-3 py-2">
          <div className="text-xs">
            <span className="text-muted">AI suggests: </span>
            <span className="font-medium text-blue-100">{aiRecommendation.recommended_disposition}</span>
            <span className="text-muted"> · </span>
            <span className="text-blue-100/90">{aiRecommendation.recommended_priority}</span>
          </div>
          {showAiHint && (
            <Button type="button" size="sm" variant="secondary" onClick={applyAiRecommendation}>
              <Sparkles className="mr-1 h-3 w-3" />
              Apply AI
            </Button>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Disposition">
            <Select
              value={form.selected_disposition}
              onChange={(e) => onFormChange({ selected_disposition: e.target.value })}
            >
              {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select
              value={form.selected_priority}
              onChange={(e) => onFormChange({ selected_priority: e.target.value })}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
            <ConfidenceSlider
              value={form.analyst_confidence}
              onChange={(v) => onFormChange({ analyst_confidence: v })}
            />
          </div>
          <FormField label="AI action" hint="How you used the AI recommendation">
            <div className="flex flex-wrap gap-1.5">
              {AI_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onFormChange({ ai_action: action })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    form.ai_action === action
                      ? AI_ACTION_STYLES[action]
                      : 'border-border/50 bg-background/30 text-muted hover:border-border',
                  )}
                >
                  {action}
                </button>
              ))}
            </div>
          </FormField>
        </div>

        {needsOverride && (
          <div className="rounded-lg border border-yellow-900/35 bg-yellow-950/15 p-3">
            <FormField label="Override reason" hint="Required when AI action is Modified or Rejected">
              <Input
                value={form.override_reason}
                onChange={(e) => onFormChange({ override_reason: e.target.value })}
                placeholder="Explain why you diverged from the AI recommendation..."
                required
              />
            </FormField>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <ToggleOption
            checked={form.escalation_needed}
            onChange={(v) => onFormChange({ escalation_needed: v })}
            label="Escalation needed"
            description="Flag for tier-2 or IR handoff"
            icon={TrendingUp}
            tone="warning"
          />
          <ToggleOption
            checked={form.client_notification_needed}
            onChange={(v) => onFormChange({ client_notification_needed: v })}
            label="Notify client"
            description="Client communication required"
            icon={Bell}
          />
        </div>

        <FormField label="Decision notes" hint="Closure rationale, actions taken, or follow-up items">
          <textarea
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
            rows={3}
            placeholder="Document your decision rationale and next steps..."
            value={form.decision_notes}
            onChange={(e) => onFormChange({ decision_notes: e.target.value })}
          />
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="flex items-center gap-1.5 text-[10px] text-muted">
            <Scale className="h-3 w-3" />
            Recorded decisions update case disposition and SLA timers
          </p>
          <Button type="submit" disabled={submitting}>
            <Gavel className="mr-1.5 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Analyst Decision'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
