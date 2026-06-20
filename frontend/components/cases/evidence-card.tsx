'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CaseEvidence } from '@/types';
import { Card, Badge } from '@/components/ui/card';
import { PanelHeader } from '@/components/ui/badges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/states';
import {
  Download, Eye, File, FileImage, FileJson, FileText, Lock, Paperclip,
  ScrollText, Upload,
} from 'lucide-react';

const EVIDENCE_TYPES = ['Log', 'Network', 'Screenshot', 'Document', 'Other'];

export type TextEvidenceForm = {
  title: string;
  content: string;
  evidence_type: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VisibilityChip({ visibility }: { visibility: string }) {
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

function evidenceIcon(item: CaseEvidence) {
  if (item.has_file) {
    const mime = item.mime_type || '';
    if (mime.startsWith('image/')) return FileImage;
    if (mime.includes('json')) return FileJson;
    if (mime.includes('pdf')) return File;
    return Paperclip;
  }
  if (item.evidence_type === 'Log') return ScrollText;
  return FileText;
}

function EvidenceItem({
  item,
  onDownload,
}: {
  item: CaseEvidence;
  onDownload: (id: string) => void;
}) {
  const Icon = evidenceIcon(item);
  const size = formatBytes(item.file_size_bytes);
  const added = item.uploaded_at || item.created_at;

  return (
    <li className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-background p-2 text-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="default">{item.evidence_type}</Badge>
                <VisibilityChip visibility={item.visibility || 'Internal'} />
              </div>
            </div>
            {item.has_file && (
              <Button size="sm" variant="secondary" onClick={() => onDownload(item.id)}>
                <Download className="mr-1 h-3 w-3" />
                Download
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            <span>{formatTime(added)}</span>
            {item.file_name && <span className="font-mono">{item.file_name}</span>}
            {size && <span>{size}</span>}
            {item.mime_type && <span>{item.mime_type}</span>}
            {item.file_hash && (
              <span className="font-mono" title={item.file_hash}>
                sha256:{item.file_hash.slice(0, 8)}…
              </span>
            )}
          </div>

          {item.content && !item.has_file && (
            <pre className="mt-2 max-h-24 overflow-auto rounded border border-border/50 bg-background p-2 font-mono text-[11px] leading-relaxed text-foreground/90">
              {item.content}
            </pre>
          )}
        </div>
      </div>
    </li>
  );
}

export function EvidenceCard({
  evidence,
  textForm,
  onTextFormChange,
  onAddText,
  addingText,
  uploadFile,
  uploadVisibility,
  onUploadFileChange,
  onUploadVisibilityChange,
  onUpload,
  uploading,
  onDownload,
}: {
  evidence: CaseEvidence[];
  textForm: TextEvidenceForm;
  onTextFormChange: (patch: Partial<TextEvidenceForm>) => void;
  onAddText: () => void;
  addingText?: boolean;
  uploadFile: File | null;
  uploadVisibility: string;
  onUploadFileChange: (file: File | null) => void;
  onUploadVisibilityChange: (value: string) => void;
  onUpload: () => void;
  uploading?: boolean;
  onDownload: (evidenceId: string) => void;
}) {
  const [mode, setMode] = useState<'text' | 'file'>('text');

  const sorted = useMemo(
    () => [...evidence].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [evidence],
  );

  const fileCount = evidence.filter((e) => e.has_file).length;
  const textCount = evidence.length - fileCount;
  const clientVisible = evidence.filter((e) => e.visibility === 'Client Visible').length;

  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="Evidence"
        subtitle="Case artifacts and investigation files"
        action={
          <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
            {evidence.length} item{evidence.length === 1 ? '' : 's'}
          </span>
        }
      />

      {evidence.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs">
          <span><strong className="text-foreground">{textCount}</strong> <span className="text-muted">text</span></span>
          <span><strong className="text-foreground">{fileCount}</strong> <span className="text-muted">files</span></span>
          <span><strong className="text-green-300">{clientVisible}</strong> <span className="text-muted">client visible</span></span>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          title="No evidence yet"
          description="Add log excerpts, uploads, or artifacts to support triage and closure."
        />
      ) : (
        <ul className="mb-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {sorted.map((e) => (
            <EvidenceItem key={e.id} item={e} onDownload={onDownload} />
          ))}
        </ul>
      )}

      <div className="border-t border-border/60 pt-4">
        <div className="mb-3 flex gap-1 rounded-lg border border-border/60 bg-background/40 p-1">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              mode === 'text' ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground',
            )}
          >
            <ScrollText className="h-3.5 w-3.5" />
            Text evidence
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              mode === 'file' ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground',
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            File upload
          </button>
        </div>

        {mode === 'text' ? (
          <div className="space-y-2 rounded-lg border border-border/60 bg-background/30 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Evidence title"
                value={textForm.title}
                onChange={(e) => onTextFormChange({ title: e.target.value })}
              />
              <Select
                value={textForm.evidence_type}
                onChange={(e) => onTextFormChange({ evidence_type: e.target.value })}
                className="text-sm"
              >
                {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <textarea
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
              rows={3}
              placeholder="Paste log lines, IOCs, or investigation notes..."
              value={textForm.content}
              onChange={(e) => onTextFormChange({ content: e.target.value })}
            />
            <Button size="sm" onClick={onAddText} disabled={!textForm.title.trim() || addingText}>
              {addingText ? 'Adding...' : 'Add Text Evidence'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-border/60 bg-background/30 p-3">
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
                uploadFile ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-background/60',
              )}
            >
              <Upload className="mb-2 h-5 w-5 text-muted" />
              <span className="text-xs font-medium text-foreground">
                {uploadFile ? uploadFile.name : 'Choose a file to upload'}
              </span>
              <span className="mt-1 text-[10px] text-muted">
                txt, log, csv, json, png, jpg, pdf — max 10 MB
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".txt,.log,.csv,.json,.png,.jpg,.jpeg,.pdf"
                onChange={(e) => onUploadFileChange(e.target.files?.[0] || null)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={uploadVisibility}
                onChange={(e) => onUploadVisibilityChange(e.target.value)}
                className="h-8 w-auto min-w-[9rem] text-xs"
              >
                <option value="Internal">Internal</option>
                <option value="Client Visible">Client Visible</option>
              </Select>
              <Button size="sm" onClick={onUpload} disabled={!uploadFile || uploading}>
                <Upload className="mr-1 h-3 w-3" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
