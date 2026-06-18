'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type {
  Case, AIRecommendation, AnalystDecision, CaseNote, CaseEvidence, CaseEvent,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle, Badge, severityVariant, slaVariant } from '@/components/ui/card';
import { DISPOSITIONS, PRIORITIES, AI_ACTIONS } from '@/lib/utils';
import { Sparkles, ClipboardCheck } from 'lucide-react';

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([]);
  const [decisions, setDecisions] = useState<AnalystDecision[]>([]);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [evidence, setEvidence] = useState<CaseEvidence[]>([]);
  const [timeline, setTimeline] = useState<CaseEvent[]>([]);
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

  const load = useCallback(async () => {
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
    if (ai[0]) {
      setDecisionForm((f) => ({
        ...f,
        selected_disposition: ai[0].recommended_disposition || f.selected_disposition,
        selected_priority: ai[0].recommended_priority || f.selected_priority,
      }));
    }
  }, [caseId]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const generateAI = async () => {
    setAiLoading(true);
    try {
      await api(`/cases/${caseId}/ai-recommendations`, { method: 'POST' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (['Modified', 'Rejected'].includes(decisionForm.ai_action) && !decisionForm.override_reason) {
      alert('Override reason required');
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
      alert(e instanceof Error ? e.message : 'Decision failed');
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

  if (!caseData) return <div className="text-muted">Loading case...</div>;

  const alertData = caseData.alerts[0];
  const latestAI = aiRecs[0];
  const latestDecision = decisions[0];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted">{caseData.case_number}</div>
          <h1 className="text-xl font-bold">{caseData.title}</h1>
        </div>
        <Link href={`/app/cases/${caseId}/qa`}>
          <Button variant="secondary"><ClipboardCheck className="mr-2 h-4 w-4" /> QA Review</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Alert & Evidence */}
        <div className="space-y-4">
          <Card>
            <CardTitle>Alert Details</CardTitle>
            {alertData ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-muted">Source</dt><dd>{alertData.source_system || '—'}</dd></div>
                <div><dt className="text-muted">Asset</dt><dd>{alertData.asset_name || '—'}</dd></div>
                <div><dt className="text-muted">Username</dt><dd>{alertData.username || '—'}</dd></div>
                <div><dt className="text-muted">Source IP</dt><dd className="font-mono">{alertData.source_ip || '—'}</dd></div>
                <div><dt className="text-muted">Destination IP</dt><dd className="font-mono">{alertData.destination_ip || '—'}</dd></div>
                <div><dt className="text-muted">MITRE</dt><dd>{alertData.mitre_tactic} / {alertData.mitre_technique}</dd></div>
                {alertData.raw_event && (
                  <div><dt className="text-muted">Raw Event</dt><dd className="mt-1 rounded bg-background p-2 font-mono text-xs">{alertData.raw_event}</dd></div>
                )}
              </dl>
            ) : <p className="mt-2 text-sm text-muted">No alert data</p>}
          </Card>

          <Card>
            <CardTitle>Evidence</CardTitle>
            <ul className="mt-2 space-y-2 text-sm">
              {evidence.map((e) => (
                <li key={e.id} className="rounded-lg bg-background p-2">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted">{e.evidence_type}</div>
                  {e.content && <div className="mt-1 font-mono text-xs">{e.content}</div>}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-2">
              <Input placeholder="Evidence title" value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} />
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} placeholder="Content" value={evidenceForm.content} onChange={(e) => setEvidenceForm({ ...evidenceForm, content: e.target.value })} />
              <Button size="sm" onClick={addEvidence}>Add Evidence</Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Timeline</CardTitle>
            <ul className="mt-2 space-y-2 text-sm">
              {timeline.map((e) => (
                <li key={e.id} className="border-l-2 border-primary pl-3">
                  <div className="font-medium">{e.event_type}</div>
                  <div className="text-xs text-muted">{new Date(e.created_at).toLocaleString()}</div>
                  {e.event_description && <div className="text-muted">{e.event_description}</div>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Center: Investigation */}
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap gap-2">
              <Badge variant={severityVariant(caseData.severity)}>{caseData.severity}</Badge>
              <Badge>{caseData.status}</Badge>
              <Badge variant={slaVariant(caseData.sla_status)}>SLA: {caseData.sla_status}</Badge>
              {latestDecision?.human_ai_agreement != null && (
                <Badge variant={latestDecision.human_ai_agreement ? 'success' : 'warning'}>
                  AI Agreement: {latestDecision.human_ai_agreement ? 'Yes' : 'No'}
                </Badge>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-muted">Client</dt><dd>{caseData.client_name}</dd></div>
              <div><dt className="text-muted">Priority</dt><dd>{caseData.priority || '—'}</dd></div>
              <div><dt className="text-muted">Assigned</dt><dd>{caseData.assigned_to_name || 'Unassigned'}</dd></div>
              <div><dt className="text-muted">Disposition</dt><dd>{caseData.disposition || '—'}</dd></div>
            </dl>
          </Card>

          <Card>
            <CardTitle>Notes</CardTitle>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-background p-2">
                  <div className="text-xs text-muted">{n.visibility} · {new Date(n.created_at).toLocaleString()}</div>
                  <div>{n.note_text}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Add note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <Button size="sm" onClick={addNote}>Add</Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Analyst Decision</CardTitle>
            <form onSubmit={submitDecision} className="mt-3 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
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
              <div className="grid grid-cols-2 gap-2">
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
                <label className="flex items-center gap-2"><input type="checkbox" checked={decisionForm.escalation_needed} onChange={(e) => setDecisionForm({ ...decisionForm, escalation_needed: e.target.checked })} /> Escalation Needed</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={decisionForm.client_notification_needed} onChange={(e) => setDecisionForm({ ...decisionForm, client_notification_needed: e.target.checked })} /> Client Notification</label>
              </div>
              <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2" rows={2} placeholder="Decision notes" value={decisionForm.decision_notes} onChange={(e) => setDecisionForm({ ...decisionForm, decision_notes: e.target.value })} />
              <Button type="submit">Submit Decision</Button>
            </form>
          </Card>
        </div>

        {/* Right: AI Assistant */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle>AI Triage Assistant</CardTitle>
              <Button size="sm" onClick={generateAI} disabled={aiLoading}>
                <Sparkles className="mr-1 h-4 w-4" />
                {aiLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            {latestAI ? (
              <div className="mt-3 space-y-3 text-sm">
                <div><div className="text-muted">Summary</div><p>{latestAI.summary}</p></div>
                <div><div className="text-muted">Key Evidence</div><ul className="list-inside list-disc">{(latestAI.key_evidence_json?.items || []).map((k, i) => <li key={i}>{k}</li>)}</ul></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><div className="text-muted">Disposition</div><div>{latestAI.recommended_disposition}</div></div>
                  <div><div className="text-muted">Priority</div><div>{latestAI.recommended_priority}</div></div>
                </div>
                <div><div className="text-muted">Confidence</div><div className="text-lg font-bold text-primary">{latestAI.confidence_score}%</div></div>
                <div><div className="text-muted">Rationale</div><p>{latestAI.rationale}</p></div>
                <div><div className="text-muted">Next Steps</div><ul className="list-inside list-disc">{(latestAI.suggested_next_steps_json?.items || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                <div><div className="text-muted">MITRE Tactics</div><div>{(latestAI.mitre_tactics_json?.items || []).join(', ')}</div></div>
                <div><div className="text-muted">MITRE Techniques</div><div>{(latestAI.mitre_techniques_json?.items || []).join(', ')}</div></div>
                {latestAI.client_notification_draft && <div><div className="text-muted">Client Notification Draft</div><p className="rounded bg-background p-2">{latestAI.client_notification_draft}</p></div>}
                {latestAI.closure_summary_draft && <div><div className="text-muted">Closure Summary Draft</div><p className="rounded bg-background p-2">{latestAI.closure_summary_draft}</p></div>}
                <div><div className="text-muted">Limitations</div><ul className="list-inside list-disc text-muted">{(latestAI.limitations_json?.items || []).map((l, i) => <li key={i}>{l}</li>)}</ul></div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No AI recommendation yet. Click Generate to create one.</p>
            )}
          </Card>

          <Card>
            <CardTitle>SLA Events</CardTitle>
            <ul className="mt-2 space-y-2 text-sm">
              {caseData.sla_events.map((e) => (
                <li key={e.id} className="flex justify-between rounded-lg bg-background p-2">
                  <span>{e.sla_type}</span>
                  <Badge variant={slaVariant(e.status)}>{e.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
