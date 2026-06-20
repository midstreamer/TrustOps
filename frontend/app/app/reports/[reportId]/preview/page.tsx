'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Report, ReportBranding } from '@/types';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ReportContent } from '@/components/reports/ReportContent';
import { ArrowLeft, Printer } from 'lucide-react';

function formatPeriod(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`;
}

function exportFilename(clientName: string, periodEnd: string) {
  const month = periodEnd.slice(0, 7);
  const safe = clientName.replace(/[^a-zA-Z0-9]+/g, '_');
  return `TrustOps_${safe}_${month}_SOC_Value_Report.pdf`;
}

export default function ReportPreviewPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [branding, setBranding] = useState<ReportBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Report>(`/reports/${reportId}`);
        setReport(r);
        const b = await api<ReportBranding>(`/report-branding/clients/${r.client_id}`);
        setBranding(b);
        document.title = exportFilename(r.title.split('—')[0]?.trim() || 'Client', r.reporting_period_end);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  if (loading) return <LoadingState message="Preparing preview..." />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  const showCover = branding?.cover_page_enabled !== false;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/reports/${reportId}`}>
          <Button variant="secondary" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Report
          </Button>
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      <article className="report-preview mx-auto max-w-3xl rounded-xl border border-border bg-white p-8 text-black shadow-lg print:border-0 print:p-10 print:shadow-none sm:p-10">
        {showCover && (
          <header className="mb-8 flex min-h-[40vh] flex-col justify-center border-b-2 border-gray-200 pb-8 text-center">
            {branding?.provider_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.provider_logo_url} alt="" className="mx-auto mb-6 h-14 object-contain" />
            )}
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {branding?.provider_name || 'TrustOps'}
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-gray-900">
              {branding?.report_title || report.title}
            </h1>
            {branding?.client_logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.client_logo_url} alt="" className="mx-auto mt-6 h-10 object-contain" />
            )}
            <p className="mt-6 text-sm text-gray-600">
              Reporting Period: {formatPeriod(report.reporting_period_start, report.reporting_period_end)}
            </p>
            {branding?.prepared_for && <p className="mt-2 text-sm text-gray-600">Prepared for: {branding.prepared_for}</p>}
            {branding?.prepared_by && <p className="text-sm text-gray-600">Prepared by: {branding.prepared_by}</p>}
            {report.published_at && (
              <p className="mt-2 text-sm text-gray-500">
                Published: {new Date(report.published_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            )}
          </header>
        )}

        {!showCover && (
          <header className="mb-8 border-b-2 border-gray-200 pb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {branding?.provider_name || 'TrustOps Client Value Report'}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900">{report.title}</h1>
            <p className="mt-3 text-sm text-gray-600">
              Reporting Period: {formatPeriod(report.reporting_period_start, report.reporting_period_end)}
            </p>
          </header>
        )}

        <ReportContent report={report} variant="print" branding={branding} />

        <footer className="mt-12 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
          {branding?.confidentiality_footer || 'This report was prepared by your managed SOC team. Internal QA notes and raw AI prompts are not included.'}
          <div className="mt-2">Generated by TrustOps — the case platform that proves service value.</div>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          aside, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .report-preview { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
}
