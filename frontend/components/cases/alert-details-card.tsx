'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/badges';
import { PanelHeader } from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import {
  ChevronDown, ChevronUp, Clock, Copy, Globe, Radar, Server, Shield, User,
} from 'lucide-react';

const SEVERITY_CARD: Record<string, string> = {
  Critical: 'border-red-900/40 bg-red-950/10',
  High: 'border-orange-900/35 bg-orange-950/10',
  Medium: 'border-yellow-900/30 bg-yellow-950/10',
  Low: 'border-border bg-card',
  Info: 'border-primary/20 bg-primary/5',
};

function formatDetected(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function copyText(value: string) {
  if (typeof navigator !== 'undefined') navigator.clipboard.writeText(value);
}

function FieldTile({
  label,
  value,
  icon: Icon,
  mono,
  onCopy,
}: {
  label: string;
  value: string | null;
  icon: React.ComponentType<{ className?: string }>;
  mono?: boolean;
  onCopy?: string;
}) {
  const display = value?.trim() || '—';
  const empty = display === '—';

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className={cn(
          'min-w-0 break-all text-sm font-medium',
          mono && 'font-mono text-xs',
          empty && 'font-normal text-muted',
        )}>
          {display}
        </p>
        {onCopy && !empty && (
          <button
            type="button"
            onClick={() => copyText(onCopy)}
            className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-border/60 hover:text-foreground"
            title={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function RawEventBlock({ raw }: { raw: string }) {
  const [expanded, setExpanded] = useState(false);

  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }, [raw]);

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Raw event</p>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => copyText(formatted)}>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>
      <pre
        className={cn(
          'overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground/90',
          expanded ? 'max-h-64' : 'max-h-24',
        )}
      >
        {formatted}
      </pre>
    </div>
  );
}

export function AlertDetailsCard({ alert, sourceSystem }: { alert: Alert | null | undefined; sourceSystem?: string | null }) {
  if (!alert) {
    return (
      <Card>
        <PanelHeader title="Alert Details" subtitle="Source detection data" />
        <EmptyState
          title="No alert attached"
          description="This case was created manually or without a linked detection event."
        />
      </Card>
    );
  }

  const severityKey = alert.severity || 'Low';
  const cardTone = SEVERITY_CARD[severityKey] || SEVERITY_CARD.Low;
  const hasMitre = alert.mitre_tactic || alert.mitre_technique;
  const source = alert.source_system || sourceSystem;

  return (
    <Card className={cn('overflow-hidden', cardTone)}>
      <PanelHeader
        title="Alert Details"
        subtitle="Source detection data"
        action={<SeverityBadge severity={alert.severity} />}
      />

      <div className="mb-4">
        <h4 className="text-sm font-semibold leading-snug text-foreground">{alert.title}</h4>
        {alert.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{alert.description}</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {source && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-muted">
            <Radar className="h-3 w-3 text-primary" />
            {source}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-muted">
          <Clock className="h-3 w-3" />
          Detected {formatDetected(alert.detected_at)}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <FieldTile label="Asset" value={alert.asset_name} icon={Server} />
        <FieldTile label="Username" value={alert.username} icon={User} />
        <FieldTile label="Source IP" value={alert.source_ip} icon={Globe} mono onCopy={alert.source_ip || undefined} />
        <FieldTile label="Destination IP" value={alert.destination_ip} icon={Globe} mono onCopy={alert.destination_ip || undefined} />
      </div>

      {hasMitre && (
        <div className="mt-4 rounded-lg border border-purple-900/30 bg-purple-950/15 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-purple-200/80">
            <Shield className="h-3 w-3" />
            MITRE ATT&CK
          </div>
          <div className="flex flex-wrap gap-2">
            {alert.mitre_tactic && (
              <span className="rounded-md border border-purple-800/40 bg-background/40 px-2 py-1 text-xs font-medium text-foreground">
                {alert.mitre_tactic}
              </span>
            )}
            {alert.mitre_technique && (
              <span className="rounded-md border border-purple-800/40 bg-background/40 px-2 py-1 font-mono text-[11px] text-muted">
                {alert.mitre_technique}
              </span>
            )}
          </div>
        </div>
      )}

      {alert.raw_event && <RawEventBlock raw={alert.raw_event} />}
    </Card>
  );
}
