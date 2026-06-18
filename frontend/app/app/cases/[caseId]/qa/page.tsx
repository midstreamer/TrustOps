'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardTitle } from '@/components/ui/card';

export default function QAReviewPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [form, setForm] = useState({
    disposition_correct: true,
    priority_correct: true,
    evidence_quality_score: 80,
    documentation_quality_score: 80,
    client_communication_score: 75,
    ai_usage_appropriate: true,
    overall_score: 80,
    review_notes: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/cases/${caseId}/qa-reviews`, { method: 'POST', body: JSON.stringify(form) });
      setSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save QA review');
    }
  };

  const set = (k: keyof typeof form, v: string | boolean | number) => setForm({ ...form, [k]: v });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">QA Review</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.disposition_correct} onChange={(e) => set('disposition_correct', e.target.checked)} /> Disposition Correct</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.priority_correct} onChange={(e) => set('priority_correct', e.target.checked)} /> Priority Correct</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.ai_usage_appropriate} onChange={(e) => set('ai_usage_appropriate', e.target.checked)} /> AI Usage Appropriate</label>
          </div>
          {(['evidence_quality_score', 'documentation_quality_score', 'client_communication_score', 'overall_score'] as const).map((field) => (
            <div key={field}>
              <label className="text-sm text-muted">{field.replace(/_/g, ' ')} ({form[field]})</label>
              <input type="range" min={0} max={100} className="w-full" value={form[field]} onChange={(e) => setForm({ ...form, [field]: +e.target.value })} />
            </div>
          ))}
          <div>
            <label className="text-sm text-muted">Review Notes</label>
            <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" rows={4} value={form.review_notes} onChange={(e) => set('review_notes', e.target.value)} />
          </div>
          <Button type="submit">Submit QA Review</Button>
          {saved && <span className="ml-3 text-sm text-green-400">Saved!</span>}
        </form>
      </Card>
    </div>
  );
}
