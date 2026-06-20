'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiUpload, getToken, evidenceDownloadUrl } from '@/lib/api';
import type {
  Case, AIRecommendation, AnalystDecision, CaseNote, CaseEvidence, CaseEvent,
  ExternalTicketSummary,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import {
  SeverityBadge, PriorityBadge, SlaBadge, AiConfidenceBadge,
  AgreementBadge, AiActionBadge, PanelHeader,
} from '@/components/ui/badges';
import { QualityBadge, QualityCard } from '@/components/dashboard/quality-badge';
import { AlertDetailsCard } from '@/components/cases/alert-details-card';
import { InvestigationWorkspaceCard } from '@/components/cases/investigation-workspace-card';
import { AiTriageAssistantCard, HumanAiComparisonCard } from '@/components/cases/ai-triage-assistant-card';
import { AnalystDecisionCard } from '@/components/cases/analyst-decision-card';
import { SlaTimersCard } from '@/components/cases/sla-timers-card';
import { EvidenceCard } from '@/components/cases/evidence-card';
import { ExternalTicketCard } from '@/components/cases/external-ticket-card';
import { TimelineCard } from '@/components/cases/timeline-card';
import { ClipboardCheck } from 'lucide-react';

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([]);
  const [decisions, setDecisions] = useState<AnalystDecision[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [evidence, setEvidence] = useState<CaseEvidence[]>([]);
  const [timeline, setTimeline] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('Internal');
  const [addingNote, setAddingNote] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ title: '', content: '', evidence_type: 'Log' });
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    selected_disposition: 'Needs More Information',
    selected_priority: 'P3 Medium',
    analyst_confidence: 75,
    ai_action: 'Accepted',
    override_reason: '',
    escalation_needed: false,
    client_notification_needed: false,
    decision_notes: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState('Internal');
  const [uploading, setUploading] = useState(false);
  const [ticketSummary, setTicketSummary] = useState<ExternalTicketSummary | null>(null);
  const [ticketTarget, setTicketTarget] = useState<string | null>(null);
  const [generatingTicket, setGeneratingTicket] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketCopied, setTicketCopied] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    external_ticket_system: 'ServiceNow',
    external_ticket_id: '',
    external_ticket_url: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, ai, dec, n, ev, tl] = await Promise.all([
        api<Case>(`/cases/${caseId}`),
        api<AIRecommendation[]>(`/cases/${caseId}/ai-recommendations`),
        api<AnalystDecision[]>(`/cases/${caseId}/decisions`),
        api<CaseNote[]>(`/cases/${caseId}/notes`),
        api<CaseEvidence[]>(`/cases/${caseId}/evidence`),
        api<CaseEvent[]>(`/cases/${caseId}/timeline`),
      ]);
      setCaseData(c);
      setAiRecs(ai);
      setDecisions(dec);
      setNotes(n);
      setEvidence(ev);
      setTimeline(tl);
      setTicketForm({
        external_ticket_system: c.external_ticket_system || 'ServiceNow',
        external_ticket_id: c.external_ticket_id || '',
        external_ticket_url: c.external_ticket_url || '',
      });
      if (ai[0] && !dec[0]) {
        setDecisionForm((f) => ({
          ...f,
          selected_disposition: ai[0].recommended_disposition || f.selected_disposition,
          selected_priority: ai[0].recommended_priority || f.selected_priority,
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const generateAI = async () => {
    setAiLoading(true);
    try {
      await api(`/cases/${caseId}/ai-recommendations`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (['Modified', 'Rejected'].includes(decisionForm.ai_action) && !decisionForm.override_reason.trim()) {
      setError('Override reason is required when AI Action is Modified or Rejected');
      return;
    }
    try {
      setSubmittingDecision(true);
      await api(`/cases/${caseId}/decisions`, {
        method: 'POST',
        body: JSON.stringify({
          ...decisionForm,
          ai_recommendation_id: aiRecs[0]?.id || null,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await api(`/cases/${caseId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note_text: noteText, visibility: noteVisibility }),
      });
      setNoteText('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const addEvidence = async () => {
    if (!evidenceForm.title.trim()) return;
    setAddingEvidence(true);
    try {
      await api(`/cases/${caseId}/evidence`, { method: 'POST', body: JSON.stringify(evidenceForm) });
      setEvidenceForm({ title: '', content: '', evidence_type: 'Log' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add evidence');
    } finally {
      setAddingEvidence(false);
    }
  };

  const uploadEvidence = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      await apiUpload(`/cases/${caseId}/evidence/upload`, uploadFile, {
        visibility: uploadVisibility,
        title: uploadFile.name,
      });
      setUploadFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadEvidence = async (evidenceId: string) => {
    const token = getToken();
    const res = await fetch(evidenceDownloadUrl(caseId, evidenceId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setError('Download failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTicketSummary = async (target: string) => {
    setGeneratingTicket(true);
    setTicketTarget(target);
    try {
      const s = await api<ExternalTicketSummary>(`/cases/${caseId}/external-ticket-summary?target=${target}`);
      setTicketSummary(s);
      setTicketCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Summary failed');
    } finally {
      setGeneratingTicket(false);
    }
  };

  const saveTicketLink = async () => {
    setSavingTicket(true);
    try {
      await api(`/cases/${caseId}/external-ticket-link`, {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingTicket(false);
    }
  };

  const copyTicketSummary = () => {
    if (!ticketSummary) return;
    const text = `${ticketSummary.short_description}\n\n${ticketSummary.description}`;
    navigator.clipboard.writeText(text);
    setTicketCopied(true);
    window.setTimeout(() => setTicketCopied(false), 2000);
  };

  if (loading) return <LoadingState message="Loading case workspace..." />;
  if (error && !caseData) return <ErrorState message={error} />;
  if (!caseData) return <EmptyState title="Case not found" />;

  const alertData = caseData.alerts[0];
  const latestAI = aiRecs[0];
  const latestDecision = decisions[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-primary">{caseData.case_number}</p>
          <h1 className="text-xl font-bold">{caseData.title}</h1>
          <p className="text-sm text-muted">{caseData.client_name} · {caseData.source_system || 'Manual'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={caseData.severity} />
          <PriorityBadge priority={caseData.priority} />
          <SlaBadge status={caseData.sla_status} />
          {latestAI && <AiConfidenceBadge score={latestAI.confidence_score} />}
          {latestDecision && <AgreementBadge agreed={latestDecision.human_ai_agreement} />}
          {latestDecision && <AiActionBadge action={latestDecision.ai_action} />}
          {caseData.quality && <QualityBadge quality={caseData.quality} compact />}
          <Link href={`/app/cases/${caseId}/qa`}>
            <Button variant="secondary" size="sm"><ClipboardCheck className="mr-1 h-4 w-4" /> QA</Button>
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {caseData.quality && (
        <QualityCard quality={caseData.quality} caseId={caseId} />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT: Alert, Evidence, Timeline, SLA */}
        <div className="space-y-4 xl:col-span-3">
          <AlertDetailsCard alert={alertData} sourceSystem={caseData.source_system} />

          <SlaTimersCard events={caseData.sla_events || []} overallStatus={caseData.sla_status} />

          <EvidenceCard
            evidence={evidence}
            textForm={evidenceForm}
            onTextFormChange={(patch) => setEvidenceForm((f) => ({ ...f, ...patch }))}
            onAddText={addEvidence}
            addingText={addingEvidence}
            uploadFile={uploadFile}
            uploadVisibility={uploadVisibility}
            onUploadFileChange={setUploadFile}
            onUploadVisibilityChange={setUploadVisibility}
            onUpload={uploadEvidence}
            uploading={uploading}
            onDownload={downloadEvidence}
          />

          <ExternalTicketCard
            caseNumber={caseData.case_number}
            linkedSystem={caseData.external_ticket_system}
            linkedId={caseData.external_ticket_id}
            linkedUrl={caseData.external_ticket_url}
            syncedAt={caseData.external_ticket_synced_at}
            ticketSummary={ticketSummary}
            activeTarget={ticketTarget}
            generating={generatingTicket}
            ticketForm={ticketForm}
            saving={savingTicket}
            copied={ticketCopied}
            onGenerate={generateTicketSummary}
            onCopy={copyTicketSummary}
            onFormChange={(patch) => setTicketForm((f) => ({ ...f, ...patch }))}
            onSave={saveTicketLink}
          />

          <TimelineCard events={timeline} />
        </div>

        {/* CENTER: Investigation + Decision */}
        <div className="space-y-4 xl:col-span-5">
          <InvestigationWorkspaceCard
            caseData={caseData}
            notes={notes}
            noteText={noteText}
            noteVisibility={noteVisibility}
            onNoteTextChange={setNoteText}
            onNoteVisibilityChange={setNoteVisibility}
            onAddNote={addNote}
            addingNote={addingNote}
          />

          <AnalystDecisionCard
            form={decisionForm}
            onFormChange={(patch) => setDecisionForm((f) => ({ ...f, ...patch }))}
            latestDecision={latestDecision}
            aiRecommendation={latestAI}
            onSubmit={submitDecision}
            submitting={submittingDecision}
          />
        </div>

        {/* RIGHT: AI Assistant */}
        <div className="space-y-4 xl:col-span-4">
          <AiTriageAssistantCard
            recommendation={latestAI}
            aiLoading={aiLoading}
            onGenerate={generateAI}
          />

          {latestAI && latestDecision && (
            <HumanAiComparisonCard recommendation={latestAI} decision={latestDecision} />
          )}
        </div>
      </div>
    </div>
  );
}
