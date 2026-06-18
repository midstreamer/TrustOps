'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Report } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ArrowLeft, Printer } from 'lucide-react';

export default function ReportPreviewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Report>(`/reports/${reportId}`)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  const caseSummary = report.case_summary_json || {};
  const slaSummary = report.sla_summary_json || {};
  const notable = report.notable_incidents_json || {};
  const themes = report.recurring_themes_json || {};
  const recs = report.recommendations_json || {};

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/app/reports/${reportId}`}>
          <Button variant="secondary"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Report</Button>
        </Link>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
      </div>

      <article className="report-preview mx-auto max-w-3xl rounded-xl border border-border bg-white p-10 text-black print:border-0 print:shadow-none">
        <header className="mb-8 border-b border-gray-300 pb-6">
          <p className="text-sm text-gray-500">TrustOps Client Value Report</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{report.title}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Reporting Period: {report.reporting_period_start} — {report.reporting_period_end}
          </p>
          {report.published_at && (
            <p className="text-sm text-gray-500">Published: {new Date(report.published_at).toLocaleDateString()}</p>
          )}
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Executive Summary</h2>
          <p className="leading-relaxed text-gray-700">{report.executive_summary}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">SOC Activity</h2>
          <p className="text-gray-700">Total cases handled: {(caseSummary as { total?: number }).total ?? 'N/A'}</p>
          {(caseSummary as { overview?: string }).overview && (
            <p className="mt-2 text-gray-700">{(caseSummary as { overview: string }).overview}</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">SLA Performance</h2>
          <p className="text-gray-700">{(slaSummary as { summary?: string }).summary}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Notable Incidents</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {((notable as { items?: Array<{ title: string }> }).items || []).map((item, i) => (
              <li key={i}>{item.title}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Recurring Risk Themes</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {((themes as { items?: string[] }).items || []).map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Recommendations</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {((recs as { items?: string[] }).items || []).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Human-AI Triage Summary</h2>
          <p className="text-gray-700">{(recs as { human_ai_triage_summary?: string }).human_ai_triage_summary}</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">SOC Value Delivered</h2>
          <p className="text-gray-700">{(recs as { soc_value_narrative?: string }).soc_value_narrative}</p>
        </section>

        <footer className="mt-12 border-t border-gray-300 pt-4 text-xs text-gray-500">
          This report was prepared by your managed SOC team. Internal QA notes and raw AI prompts are not included.
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .report-preview { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
