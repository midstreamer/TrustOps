'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CaseEvent } from '@/types';
import { Card } from '@/components/ui/card';
import { PanelHeader } from '@/components/ui/badges';
import { EmptyState } from '@/components/ui/states';
import {
  Activity, CheckCircle2, ClipboardCheck, FileText, Gavel,
  Link2, Plus, ScrollText, Shield, Sparkles, Upload, User,
} from 'lucide-react';

type EventMeta = {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  dot: string;
};

function normalizeType(eventType: string) {
  return eventType.toLowerCase().replace(/\s+/g, '_');
}

function eventMeta(eventType: string): EventMeta {
  const t = normalizeType(eventType);
  if (t.includes('case_created') || t.includes('case created')) {
    return { icon: Plus, tone: 'text-primary', dot: 'bg-primary ring-primary/30' };
  }
  if (t.includes('ai') || t.includes('recommendation')) {
    return { icon: Sparkles, tone: 'text-blue-300', dot: 'bg-blue-400 ring-blue-400/30' };
  }
  if (t.includes('decision') || t.includes('disposition')) {
    return { icon: Gavel, tone: 'text-emerald-300', dot: 'bg-emerald-400 ring-emerald-400/30' };
  }
  if (t.includes('qa')) {
    return { icon: ClipboardCheck, tone: 'text-purple-300', dot: 'bg-purple-400 ring-purple-400/30' };
  }
  if (t.includes('evidence') && t.includes('upload')) {
    return { icon: Upload, tone: 'text-cyan-300', dot: 'bg-cyan-400 ring-cyan-400/30' };
  }
  if (t.includes('evidence')) {
    return { icon: FileText, tone: 'text-cyan-300', dot: 'bg-cyan-400 ring-cyan-400/30' };
  }
  if (t.includes('external_ticket') || t.includes('ticket')) {
    return { icon: Link2, tone: 'text-orange-300', dot: 'bg-orange-400 ring-orange-400/30' };
  }
  if (t.includes('assign')) {
    return { icon: User, tone: 'text-muted', dot: 'bg-muted ring-border' };
  }
  if (t.includes('sla')) {
    return { icon: Shield, tone: 'text-yellow-300', dot: 'bg-yellow-400 ring-yellow-400/30' };
  }
  if (t.includes('note')) {
    return { icon: ScrollText, tone: 'text-muted', dot: 'bg-muted ring-border' };
  }
  if (t.includes('status') || t.includes('closed') || t.includes('resolved')) {
    return { icon: CheckCircle2, tone: 'text-green-300', dot: 'bg-green-400 ring-green-400/30' };
  }
  return { icon: Activity, tone: 'text-muted', dot: 'bg-border ring-border' };
}

function formatAbsolute(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TimelineEvent({ event, isLast }: { event: CaseEvent; isLast: boolean }) {
  const meta = eventMeta(event.event_type);
  const Icon = meta.icon;

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <div className="relative flex w-8 shrink-0 justify-center">
        {!isLast && (
          <span
            className="absolute left-1/2 top-6 bottom-0 w-px -translate-x-1/2 bg-border"
            aria-hidden
          />
        )}
        <div className={cn(
          'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ring-card',
          meta.dot,
        )}>
          <Icon className="h-3 w-3 text-background" />
        </div>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {event.event_type}
          </p>
          <time className="text-[10px] text-muted" title={formatAbsolute(event.created_at)}>
            {formatRelative(event.created_at)}
          </time>
        </div>
        <p className="text-[10px] text-muted">{formatAbsolute(event.created_at)}</p>
        {event.event_description && (
          <p className="mt-2 rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 text-xs leading-relaxed text-muted">
            {event.event_description}
          </p>
        )}
      </div>
    </li>
  );
}

export function TimelineCard({ events }: { events: CaseEvent[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [events],
  );

  const grouped = useMemo(() => {
    const groups: { date: string; items: CaseEvent[] }[] = [];
    for (const event of sorted) {
      const date = formatDateLabel(event.created_at);
      const last = groups[groups.length - 1];
      if (last?.date === date) last.items.push(event);
      else groups.push({ date, items: [event] });
    }
    return groups;
  }, [sorted]);

  return (
    <Card>
      <PanelHeader
        title="Timeline"
        subtitle="Chronological audit trail"
        action={
          <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
            {events.length} event{events.length === 1 ? '' : 's'}
          </span>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="No timeline events"
          description="Case activity will appear here as triage, decisions, and evidence are recorded."
        />
      ) : (
        <div className="max-h-80 space-y-5 overflow-y-auto px-1">
          {grouped.map((group, groupIndex) => (
            <section key={group.date}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {group.date}
              </p>
              <ol className="list-none">
                {group.items.map((event, itemIndex) => {
                  const isLast =
                    groupIndex === grouped.length - 1
                    && itemIndex === group.items.length - 1;
                  return (
                    <TimelineEvent
                      key={event.id}
                      event={event}
                      isLast={isLast}
                    />
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
