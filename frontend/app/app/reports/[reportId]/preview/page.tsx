'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Report } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ReportContent } from '@/components/reports/ReportContent';
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/app/reports/${reportId}`}>
          <Button variant="secondary"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Report</Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
        </Button>
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

        <ReportContent report={report} variant="print" />

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
