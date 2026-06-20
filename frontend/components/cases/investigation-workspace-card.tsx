'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Case, CaseNote } from '@/types';
import { Card, Badge } from '@/components/ui/card';
import { PanelHeader } from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/states';
import {
  Calendar, ClipboardList, Eye, FileText, Lock, MessageSquarePlus, UserCircle,
} from 'lucide-react';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_VARIANT: Record<string, string> = {
  New: 'default',
  Investigating: 'warning',
  'Pending Client': 'medium',
  Resolved: 'success',
  Closed: 'success',
};

function ContextTile({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: string;
}) {
  const empty = value === '—';
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </div>
      {variant && !empty ? (
        <Badge variant={variant}>{value}</Badge>
      ) : (
        <p className={cn('text-sm font-medium', empty && 'font-normal text-muted')}>{value}</p>
      )}
    </div>
  );
}

function NoteVisibilityChip({ visibility }: { visibility: string }) {
  const internal = visibility === 'Internal';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        internal
          ? 'border-yellow-900/40 bg-yellow-950/30 text-yellow-200'
          : 'border-green-900/40 bg-green-950/25 text-green-200',
      )}
    >
      {internal ? <Lock className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
      {visibility}
    </span>
  );
}

function NoteItem({ note }: { note: CaseNote }) {
  return (
    <li className="rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <NoteVisibilityChip visibility={note.visibility} />
        <time className="text-[10px] text-muted">{formatTime(note.created_at)}</time>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{note.note_text}</p>
    </li>
  );
}

export function InvestigationWorkspaceCard({
  caseData,
  notes,
  noteText,
  noteVisibility,
  onNoteTextChange,
  onNoteVisibilityChange,
  onAddNote,
  addingNote,
}: {
  caseData: Case;
  notes: CaseNote[];
  noteText: string;
  noteVisibility: string;
  onNoteTextChange: (value: string) => void;
  onNoteVisibilityChange: (value: string) => void;
  onAddNote: () => void;
  addingNote?: boolean;
}) {
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [notes],
  );

  const statusVariant = STATUS_VARIANT[caseData.status] || 'default';

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
      <PanelHeader
        title="Investigation Workspace"
        subtitle="Analyst notes and case context"
        action={
          <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
            {notes.length} note{notes.length === 1 ? '' : 's'}
          </span>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <ContextTile label="Status" value={caseData.status} icon={ClipboardList} variant={statusVariant} />
        <ContextTile
          label="Assigned"
          value={caseData.assigned_to_name || 'Unassigned'}
          icon={UserCircle}
        />
        <ContextTile
          label="Disposition"
          value={caseData.disposition || '—'}
          icon={FileText}
        />
        <ContextTile
          label="Detected"
          value={formatShortDate(caseData.detected_at)}
          icon={Calendar}
        />
      </div>

      {caseData.description && (
        <div className="mb-4 rounded-lg border border-border/60 border-l-4 border-l-primary/50 bg-background/50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">Case summary</p>
          <p className="text-sm leading-relaxed text-foreground/90">{caseData.description}</p>
        </div>
      )}

      <div className="border-t border-border/60 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Investigation notes
          </h4>
        </div>

        {sortedNotes.length === 0 ? (
          <EmptyState
            title="No investigation notes yet"
            description="Document findings, hypotheses, and next steps as you work the case."
          />
        ) : (
          <ul className="mb-4 max-h-52 space-y-2 overflow-y-auto pr-1">
            {sortedNotes.map((n) => (
              <NoteItem key={n.id} note={n} />
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-border bg-background/40 p-3">
          <textarea
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
            rows={3}
            placeholder="Add investigation note — findings, IOCs, next steps..."
            value={noteText}
            onChange={(e) => onNoteTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onAddNote();
            }}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={noteVisibility}
                onChange={(e) => onNoteVisibilityChange(e.target.value)}
                className="h-8 w-auto min-w-[9rem] text-xs"
              >
                <option value="Internal">Internal</option>
                <option value="Client Visible">Client Visible</option>
              </Select>
              <span className="hidden text-[10px] text-muted sm:inline">⌘/Ctrl + Enter to save</span>
            </div>
            <Button size="sm" onClick={onAddNote} disabled={!noteText.trim() || addingNote}>
              {addingNote ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
