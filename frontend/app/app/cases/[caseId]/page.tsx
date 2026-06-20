'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiUpload, getToken, evidenceDownloadUrl } from '@/lib/api';
import type {
  Case, AIRecommendation, AnalystDecision, CaseNote, CaseEvidence, CaseEvent, SLAEvent,
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
import { QualityCard } from '@/components/dashboard/quality-badge';
import { DISPOSITIONS, PRIORITIES, AI_ACTIONS } from '@/lib/utils';
import { Sparkles, ClipboardCheck, Upload, Download, ExternalLink, Copy } from 'lucide-react';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function slaCountdown(event: SLAEvent) {
  if (event.completed_at) return 'Completed';
  const due = new Date(event.due_at).getTime();
  const now = Date.now();
  const mins = Math.round((due - now) / 60000);
  if (mins < 0) return `${Math.abs(mins)}m overdue`;
  return `${mins}m remaining`;
}

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
  const [evidenceForm, setEvidenceForm] = useState({ title: '', content: '', evidence_type: 'Log' });
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
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    await api(`/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify({ note_text: noteText }) });
    setNoteText('');
    await load();
  };

  const addEvidence = async () => {
    if (!evidenceForm.title.trim()) return;
    await api(`/cases/${caseId}/evidence`, { method: 'POST', body: JSON.stringify(evidenceForm) });
    setEvidenceForm({ title: '', content: '', evidence_type: 'Log' });
    await load();
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
    try {
      const s = await api<ExternalTicketSummary>(`/cases/${caseId}/external-ticket-summary?target=${target}`);
      setTicketSummary(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Summary failed');
    }
  };

  const saveTicketLink = async () => {
    try {
      await api(`/cases/${caseId}/external-ticket-link`, {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const copyTicketSummary = () => {
    if (!ticketSummary) return;
    const text = `${ticketSummary.short_description}\n\n${ticketSummary.description}`;
    navigator.clipboard.writeText(text);
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
          <Link href={`/app/cases/${caseId}/qa`}>
            <Button variant="secondary" size="sm"><ClipboardCheck className="mr-1 h-4 w-4" /> QA</Button>
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {caseData.quality && (
        <QualityCard quality={caseData.quality} />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT: Alert, Evidence, Timeline, SLA */}
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <PanelHeader title="Alert Details" subtitle="Source detection data" />
            {alertData ? (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-muted">Asset</dt><dd>{alertData.asset_name || '—'}</dd></div>
                <div><dt className="text-muted">Username</dt><dd>{alertData.username || '—'}</dd></div>
                <div><dt className="text-muted">Source IP</dt><dd className="font-mono text-xs">{alertData.source_ip || '—'}</dd></div>
                <div><dt className="text-muted">Dest IP</dt><dd className="font-mono text-xs">{alertData.destination_ip || '—'}</dd></div>
                <div><dt className="text-muted">MITRE</dt><dd className="text-xs">{alertData.mitre_tactic} / {alertData.mitre_technique}</dd></div>
                {alertData.raw_event && (
                  <div><dt className="text-muted">Raw Event</dt><dd className="mt-1 max-h-24 overflow-auto rounded bg-background p-2 font-mono text-xs">{alertData.raw_event}</dd></div>
                )}
              </dl>
            ) : <p className="text-sm text-muted">No alert attached</p>}
          </Card>

          <Card>
            <PanelHeader title="SLA Timers" subtitle="Active SLA commitments" />
            <ul className="space-y-2 text-sm">
              {(caseData.sla_events || []).map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                  <div>
                    <div className="font-medium">{e.sla_type}</div>
                    <div className="text-xs text-muted">{slaCountdown(e)}</div>
                  </div>
                  <SlaBadge status={e.status} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <PanelHeader title="Evidence" />
            {evidence.length === 0 ? (
              <p className="text-sm text-muted">No evidence yet</p>
            ) : (
              <ul className="mb-3 space-y-2 text-sm">
                {evidence.map((e) => (
                  <li key={e.id} className="rounded-lg bg-background p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-muted">
                          {e.evidence_type}
                          {e.file_name && ` · ${e.file_name}`}
                          {e.file_size_bytes != null && ` · ${(e.file_size_bytes / 1024).toFixed(1)} KB`}
                          {e.visibility && ` · ${e.visibility}`}
                        </div>
                      </div>
                      {e.has_file && (
                        <Button size="sm" variant="secondary" onClick={() => downloadEvidence(e.id)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {e.content && <div className="mt-1 font-mono text-xs">{e.content}</div>}
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 border-t border-border pt-3">
              <Input placeholder="Evidence title" value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} />
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} placeholder="Content" value={evidenceForm.content} onChange={(e) => setEvidenceForm({ ...evidenceForm, content: e.target.value })} />
              <Button size="sm" onClick={addEvidence}>Add Text Evidence</Button>
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <input type="file" className="text-xs" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                <Select value={uploadVisibility} onChange={(e) => setUploadVisibility(e.target.value)}>
                  <option value="Internal">Internal</option>
                  <option value="Client Visible">Client Visible</option>
                </Select>
                <Button size="sm" onClick={uploadEvidence} disabled={!uploadFile || uploading}>
                  <Upload className="mr-1 h-3 w-3" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <PanelHeader title="External Ticket" subtitle="Export summary to ServiceNow or Jira" />
            <div className="mb-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => generateTicketSummary('servicenow')}>ServiceNow</Button>
              <Button size="sm" variant="secondary" onClick={() => generateTicketSummary('jira')}>Jira</Button>
              <Button size="sm" variant="secondary" onClick={() => generateTicketSummary('generic')}>Generic</Button>
              {ticketSummary && (
                <Button size="sm" variant="secondary" onClick={copyTicketSummary}><Copy className="mr-1 h-3 w-3" />Copy</Button>
              )}
            </div>
            {ticketSummary && (
              <div className="mb-4 rounded-lg bg-background p-3 text-xs">
                <div className="font-medium">{ticketSummary.short_description}</div>
                <pre className="mt-2 whitespace-pre-wrap text-muted">{ticketSummary.description}</pre>
              </div>
            )}
            <div className="space-y-2 text-sm">
              <Select value={ticketForm.external_ticket_system} onChange={(e) => setTicketForm({ ...ticketForm, external_ticket_system: e.target.value })}>
                <option value="ServiceNow">ServiceNow</option>
                <option value="Jira">Jira</option>
              </Select>
              <Input placeholder="Ticket ID" value={ticketForm.external_ticket_id} onChange={(e) => setTicketForm({ ...ticketForm, external_ticket_id: e.target.value })} />
              <Input placeholder="Ticket URL" value={ticketForm.external_ticket_url} onChange={(e) => setTicketForm({ ...ticketForm, external_ticket_url: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTicketLink}>Save Link</Button>
                {caseData.external_ticket_url && (
                  <a href={caseData.external_ticket_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary"><ExternalLink className="mr-1 h-3 w-3" />Open</Button>
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <PanelHeader title="Timeline" subtitle="Chronological audit trail" />
            {timeline.length === 0 ? (
              <p className="text-sm text-muted">No events</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {timeline.map((e) => (
                  <li key={e.id} className="border-l-2 border-primary/50 pl-3">
                    <div className="font-medium">{e.event_type}</div>
                    <div className="text-xs text-muted">{formatTime(e.created_at)}</div>
                    {e.event_description && <div className="text-muted">{e.event_description}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* CENTER: Investigation + Decision */}
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <PanelHeader title="Investigation Workspace" subtitle="Analyst notes and case context" />
            <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted">Status</dt><dd>{caseData.status}</dd></div>
              <div><dt className="text-muted">Assigned</dt><dd>{caseData.assigned_to_name || 'Unassigned'}</dd></div>
              <div><dt className="text-muted">Disposition</dt><dd>{caseData.disposition || '—'}</dd></div>
              <div><dt className="text-muted">Detected</dt><dd>{caseData.detected_at ? formatTime(caseData.detected_at) : '—'}</dd></div>
            </dl>
            {caseData.description && <p className="mb-4 text-sm text-muted">{caseData.description}</p>}

            <div className="border-t border-border pt-4">
              <h4 className="mb-2 text-sm font-medium">Notes</h4>
              {notes.length === 0 ? <p className="mb-2 text-sm text-muted">No notes</p> : (
                <ul className="mb-3 max-h-36 space-y-2 overflow-y-auto text-sm">
                  {notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-background p-2">
                      <div className="text-xs text-muted">{n.visibility} · {formatTime(n.created_at)}</div>
                      <div>{n.note_text}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input placeholder="Add investigation note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <Button size="sm" onClick={addNote}>Add</Button>
              </div>
            </div>
          </Card>

          <Card className="border-primary/30">
            <PanelHeader title="Analyst Decision" subtitle="Human decision — final authority" />
            {latestDecision && (
              <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-background p-3 text-sm">
                <span>Recorded: {formatTime(latestDecision.created_at)}</span>
                <AgreementBadge agreed={latestDecision.human_ai_agreement} />
                <AiActionBadge action={latestDecision.ai_action} />
                <AiConfidenceBadge score={latestDecision.analyst_confidence} />
              </div>
            )}
            <form onSubmit={submitDecision} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted">Disposition</label>
                  <Select value={decisionForm.selected_disposition} onChange={(e) => setDecisionForm({ ...decisionForm, selected_disposition: e.target.value })}>
                    {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-muted">Priority</label>
                  <Select value={decisionForm.selected_priority} onChange={(e) => setDecisionForm({ ...decisionForm, selected_priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted">Analyst Confidence ({decisionForm.analyst_confidence}%)</label>
                  <input type="range" min={0} max={100} className="w-full" value={decisionForm.analyst_confidence} onChange={(e) => setDecisionForm({ ...decisionForm, analyst_confidence: +e.target.value })} />
                </div>
                <div>
                  <label className="text-muted">AI Action</label>
                  <Select value={decisionForm.ai_action} onChange={(e) => setDecisionForm({ ...decisionForm, ai_action: e.target.value })}>
                    {AI_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </Select>
                </div>
              </div>
              {['Modified', 'Rejected'].includes(decisionForm.ai_action) && (
                <div>
                  <label className="text-muted">Override Reason *</label>
                  <Input value={decisionForm.override_reason} onChange={(e) => setDecisionForm({ ...decisionForm, override_reason: e.target.value })} required />
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={decisionForm.escalation_needed} onChange={(e) => setDecisionForm({ ...decisionForm, escalation_needed: e.target.checked })} /> Escalation</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={decisionForm.client_notification_needed} onChange={(e) => setDecisionForm({ ...decisionForm, client_notification_needed: e.target.checked })} /> Notify Client</label>
              </div>
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2" rows={2} placeholder="Decision notes" value={decisionForm.decision_notes} onChange={(e) => setDecisionForm({ ...decisionForm, decision_notes: e.target.value })} />
              <Button type="submit">Submit Analyst Decision</Button>
            </form>
          </Card>
        </div>

        {/* RIGHT: AI Assistant */}
        <div className="space-y-4 xl:col-span-4">
          <Card className="border-blue-900/30 bg-blue-950/10">
            <PanelHeader
              title="AI Triage Assistant"
              subtitle="Recommendation only — not a final decision"
              action={
                <Button size="sm" onClick={generateAI} disabled={aiLoading}>
                  <Sparkles className="mr-1 h-4 w-4" />
                  {aiLoading ? 'Generating...' : 'Generate'}
                </Button>
              }
            />
            {!latestAI ? (
              <EmptyState title="No AI recommendation" description="Generate a triage recommendation to assist investigation." />
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <AiConfidenceBadge score={latestAI.confidence_score} />
                  <PriorityBadge priority={latestAI.recommended_priority} />
                  <span className="inline-flex rounded-full bg-border px-2.5 py-0.5 text-xs font-medium">{latestAI.recommended_disposition}</span>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-muted">Summary</div>
                  <p className="mt-1">{latestAI.summary}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-muted">Key Evidence</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{(latestAI.key_evidence_json?.items || []).map((k, i) => <li key={i} className="pl-1">{k}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-muted">Rationale</div>
                  <p className="mt-1">{latestAI.rationale}</p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-muted">Suggested Next Steps</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">{(latestAI.suggested_next_steps_json?.items || []).map((s, i) => <li key={i} className="pl-1">{s}</li>)}</ul>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted">MITRE Tactics</span><div>{(latestAI.mitre_tactics_json?.items || []).join(', ') || '—'}</div></div>
                  <div><span className="text-muted">MITRE Techniques</span><div>{(latestAI.mitre_techniques_json?.items || []).join(', ') || '—'}</div></div>
                </div>
                {(latestAI.limitations_json?.items || []).length > 0 && (
                  <div className="rounded-lg bg-yellow-900/20 p-2 text-xs text-yellow-200">
                    <strong>Limitations:</strong> {(latestAI.limitations_json?.items || []).join('; ')}
                  </div>
                )}
              </div>
            )}
          </Card>

          {latestAI && latestDecision && (
            <Card>
              <PanelHeader title="Human-AI Comparison" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted">AI Recommended</div>
                  <div>{latestAI.recommended_disposition}</div>
                  <div className="text-muted">{latestAI.recommended_priority}</div>
                  <AiConfidenceBadge score={latestAI.confidence_score} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-muted">Analyst Selected</div>
                  <div>{latestDecision.selected_disposition}</div>
                  <div className="text-muted">{latestDecision.selected_priority}</div>
                  <AiConfidenceBadge score={latestDecision.analyst_confidence} />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <AgreementBadge agreed={latestDecision.human_ai_agreement} />
                <AiActionBadge action={latestDecision.ai_action} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
