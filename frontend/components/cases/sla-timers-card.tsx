'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { SLAEvent } from '@/types';
import { Card } from '@/components/ui/card';
import { PanelHeader, SlaBadge } from '@/components/ui/badges';
import { EmptyState } from '@/components/ui/states';
import {
  Bell, CheckCircle2, ClipboardCheck, Clock, Shield, Timer, Zap,
} from 'lucide-react';

const SLA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Triage: Zap,
  Disposition: ClipboardCheck,
  Notification: Bell,
  Closure: CheckCircle2,
};

const STATUS_TONE: Record<string, { bar: string; border: string; text: string }> = {
  Met: { bar: 'bg-green-500/80', border: 'border-green-900/35 bg-green-950/10', text: 'text-green-400' },
  'In Progress': { bar: 'bg-primary/80', border: 'border-primary/25 bg-primary/5', text: 'text-primary' },
  'At Risk': { bar: 'bg-yellow-500/80', border: 'border-yellow-900/35 bg-yellow-950/15', text: 'text-yellow-300' },
  Breached: { bar: 'bg-red-500/80', border: 'border-red-900/35 bg-red-950/15', text: 'text-red-400' },
};

function formatDue(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slaCountdown(event: SLAEvent): { label: string; tone: 'default' | 'warning' | 'danger' | 'success' } {
  if (event.completed_at) {
    return { label: `Completed ${formatDue(event.completed_at)}`, tone: 'success' };
  }
  const due = new Date(event.due_at).getTime();
  const now = Date.now();
  const mins = Math.round((due - now) / 60000);
  if (event.breached || mins < 0) {
    return { label: `${Math.abs(mins)}m overdue`, tone: 'danger' };
  }
  if (event.status === 'At Risk' || mins <= event.target_minutes * 0.25) {
    return { label: `${mins}m remaining`, tone: 'warning' };
  }
  return { label: `${mins}m remaining`, tone: 'default' };
}

function progressPercent(event: SLAEvent): number {
  if (event.completed_at) return 100;
  const totalMs = event.target_minutes * 60 * 1000;
  if (totalMs <= 0) return 0;
  const due = new Date(event.due_at).getTime();
  const start = due - totalMs;
  const now = Date.now();
  const pct = ((now - start) / totalMs) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function SlaTimerRow({ event }: { event: SLAEvent }) {
  const Icon = SLA_ICONS[event.sla_type] || Timer;
  const status = event.breached ? 'Breached' : event.status;
  const tone = STATUS_TONE[status] || STATUS_TONE['In Progress'];
  const countdown = slaCountdown(event);
  const pct = progressPercent(event);

  return (
    <li className={cn('rounded-lg border p-3', tone.border)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="rounded-md bg-background/60 p-1.5 text-muted">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{event.sla_type}</div>
            <div className="text-[10px] text-muted">
              Target {event.target_minutes}m · Due {formatDue(event.due_at)}
            </div>
          </div>
        </div>
        <SlaBadge status={event.breached ? 'Breached' : event.status} />
      </div>

      <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className={cn(
          'font-medium',
          countdown.tone === 'danger' && 'text-red-400',
          countdown.tone === 'warning' && 'text-yellow-300',
          countdown.tone === 'success' && 'text-green-400',
          countdown.tone === 'default' && 'text-muted',
        )}>
          {countdown.label}
        </span>
        <span className="tabular-nums text-muted">{pct}% elapsed</span>
      </div>
    </li>
  );
}

export function SlaTimersCard({
  events,
  overallStatus,
}: {
  events: SLAEvent[];
  overallStatus?: string | null;
}) {
  const sorted = useMemo(() => {
    const order = ['Triage', 'Disposition', 'Notification', 'Closure'];
    return [...events].sort((a, b) => order.indexOf(a.sla_type) - order.indexOf(b.sla_type));
  }, [events]);

  const breached = events.filter((e) => e.breached || e.status === 'Breached').length;
  const atRisk = events.filter((e) => e.status === 'At Risk' && !e.breached).length;
  const met = events.filter((e) => e.status === 'Met' || e.completed_at).length;

  const summaryTone = breached > 0
    ? 'border-red-900/35 bg-red-950/10'
    : atRisk > 0
      ? 'border-yellow-900/30 bg-yellow-950/10'
      : 'border-border/60 bg-background/40';

  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="SLA Timers"
        subtitle="Active SLA commitments"
        action={overallStatus ? <SlaBadge status={overallStatus} /> : undefined}
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="No SLA timers"
          description="SLA events are created when a case is opened with a matching client policy."
        />
      ) : (
        <>
          <div className={cn('mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5', summaryTone)}>
            <Shield className="h-4 w-4 shrink-0 text-muted" />
            <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-xs">
              <span><strong className="text-foreground">{met}</strong> <span className="text-muted">met</span></span>
              <span><strong className="text-yellow-300">{atRisk}</strong> <span className="text-muted">at risk</span></span>
              <span><strong className="text-red-400">{breached}</strong> <span className="text-muted">breached</span></span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <Clock className="h-3 w-3" />
              {sorted.length} active
            </span>
          </div>

          <ul className="space-y-2">
            {sorted.map((e) => (
              <SlaTimerRow key={e.id} event={e} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
