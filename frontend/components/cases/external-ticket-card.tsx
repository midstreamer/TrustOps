'use client';

import { cn } from '@/lib/utils';
import type { ExternalTicketSummary } from '@/types';
import { Card, Badge } from '@/components/ui/card';
import { PanelHeader } from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ArrowUpRight, Check, Copy, ExternalLink, Link2, Ticket, Workflow,
} from 'lucide-react';

export type ExternalTicketForm = {
  external_ticket_system: string;
  external_ticket_id: string;
  external_ticket_url: string;
};

type Target = 'servicenow' | 'jira' | 'generic';

const TARGETS: { id: Target; label: string; hint: string }[] = [
  { id: 'servicenow', label: 'ServiceNow', hint: 'Incident fields' },
  { id: 'jira', label: 'Jira', hint: 'Issue export' },
  { id: 'generic', label: 'Generic', hint: 'Any ITSM' },
];

const TARGET_ACCENT: Record<Target, string> = {
  servicenow: 'border-emerald-900/35 bg-emerald-950/15',
  jira: 'border-blue-900/35 bg-blue-950/15',
  generic: 'border-border/60 bg-background/40',
};

function formatSynced(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryPreview({
  summary,
  onCopy,
  copied,
}: {
  summary: ExternalTicketSummary;
  onCopy: () => void;
  copied?: boolean;
}) {
  const target = (summary.target as Target) || 'generic';

  return (
    <div className={cn('rounded-lg border p-3', TARGET_ACCENT[target] || TARGET_ACCENT.generic)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {summary.target} export preview
          </p>
          <p className="mt-1 text-sm font-medium leading-snug">{summary.short_description}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onCopy}>
          {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="default">{summary.priority}</Badge>
        {summary.category && <Badge variant="default">{summary.category}</Badge>}
        {summary.subcategory && <Badge variant="default">{summary.subcategory}</Badge>}
        <Badge variant="default">Ref: {summary.external_reference}</Badge>
        {summary.assignment_group && <Badge variant="default">{summary.assignment_group}</Badge>}
        {summary.issue_type && <Badge variant="default">{summary.issue_type}</Badge>}
        {(summary.labels || []).map((l) => (
          <Badge key={l} variant="default">{l}</Badge>
        ))}
      </div>

      <pre className="max-h-40 overflow-auto rounded-lg border border-border/50 bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
        {summary.description}
      </pre>
    </div>
  );
}

export function ExternalTicketCard({
  caseNumber,
  linkedSystem,
  linkedId,
  linkedUrl,
  syncedAt,
  ticketSummary,
  activeTarget,
  generating,
  ticketForm,
  saving,
  copied,
  onGenerate,
  onCopy,
  onFormChange,
  onSave,
}: {
  caseNumber: string;
  linkedSystem?: string | null;
  linkedId?: string | null;
  linkedUrl?: string | null;
  syncedAt?: string | null;
  ticketSummary: ExternalTicketSummary | null;
  activeTarget?: string | null;
  generating?: boolean;
  ticketForm: ExternalTicketForm;
  saving?: boolean;
  copied?: boolean;
  onGenerate: (target: Target) => void;
  onCopy: () => void;
  onFormChange: (patch: Partial<ExternalTicketForm>) => void;
  onSave: () => void;
}) {
  const hasLink = Boolean(linkedId || linkedUrl);

  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="External Ticket"
        subtitle="Export summary to ServiceNow or Jira"
        action={<Ticket className="h-5 w-5 text-muted" />}
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted">
        <Workflow className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Lightweight export stub — copy a case summary into your ITSM. No bidirectional sync; link tickets manually for traceability.
        </p>
      </div>

      {hasLink && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Linked ticket</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{linkedSystem || 'ITSM'}</Badge>
            <span className="font-mono text-sm font-medium">{linkedId || '—'}</span>
            {syncedAt && <span className="text-[10px] text-muted">Saved {formatSynced(syncedAt)}</span>}
          </div>
          {linkedUrl && (
            <a
              href={linkedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex"
            >
              <Button size="sm" variant="secondary">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in {linkedSystem || 'ITSM'}
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </a>
          )}
        </div>
      )}

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Generate summary</p>
        <div className="flex flex-wrap gap-1.5">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={generating}
              onClick={() => onGenerate(t.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50',
                (activeTarget || ticketSummary?.target) === t.id
                  ? TARGET_ACCENT[t.id]
                  : 'border-border/60 bg-background/30 hover:border-border',
              )}
            >
              <div className="text-xs font-medium">{t.label}</div>
              <div className="text-[10px] text-muted">{t.hint}</div>
            </button>
          ))}
        </div>
        {generating && <p className="mt-2 text-[10px] text-muted">Building export summary for {caseNumber}…</p>}
      </div>

      {ticketSummary && (
        <div className="mb-4">
          <SummaryPreview summary={ticketSummary} onCopy={onCopy} copied={copied} />
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <Link2 className="h-3.5 w-3.5" />
          Save external ticket link
        </p>
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/30 p-3">
          <Select
            value={ticketForm.external_ticket_system}
            onChange={(e) => onFormChange({ external_ticket_system: e.target.value })}
            className="text-sm"
          >
            <option value="ServiceNow">ServiceNow</option>
            <option value="Jira">Jira</option>
          </Select>
          <Input
            placeholder="Ticket ID (e.g. INC0012345)"
            value={ticketForm.external_ticket_id}
            onChange={(e) => onFormChange({ external_ticket_id: e.target.value })}
          />
          <Input
            placeholder="Ticket URL"
            value={ticketForm.external_ticket_url}
            onChange={(e) => onFormChange({ external_ticket_url: e.target.value })}
          />
          <Button
            size="sm"
            onClick={onSave}
            disabled={!ticketForm.external_ticket_id.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save Ticket Link'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
