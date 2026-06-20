'use client';

import { cn } from '@/lib/utils';
import type { CaseQuality } from '@/types';

const GRADE_STYLES: Record<string, string> = {
  Excellent: 'bg-green-900/40 text-green-300 border-green-800/50',
  Good: 'bg-primary/15 text-primary border-primary/30',
  'Needs Attention': 'bg-yellow-900/40 text-yellow-300 border-yellow-800/50',
  Poor: 'bg-red-900/40 text-red-300 border-red-800/50',
};

export function QualityBadge({ quality, compact }: { quality: CaseQuality; compact?: boolean }) {
  const style = GRADE_STYLES[quality.quality_grade] || GRADE_STYLES.Good;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        style,
        compact && 'px-1.5',
      )}
      title={quality.flags.join(', ') || undefined}
    >
      {quality.quality_score}
      {!compact && <span className="ml-1 opacity-80">{quality.quality_grade}</span>}
    </span>
  );
}

export function QualityCard({ quality }: { quality: CaseQuality }) {
  const breakdown = quality.score_breakdown;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Case Quality</h3>
          <p className="mt-1 text-xs text-muted">
            Transparent score: evidence (20), decision (20), SLA (20), closure (15), QA (15), client comms (10).
          </p>
        </div>
        <QualityBadge quality={quality} />
      </div>
      {quality.flags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {quality.flags.map((flag) => (
            <li key={flag} className="rounded-md bg-background px-2 py-0.5 text-xs text-muted">
              {flag}
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {Object.entries(breakdown).map(([key, value]) => (
          <div key={key} className="flex justify-between rounded bg-background/60 px-2 py-1">
            <dt className="text-muted">{key.replace(/_/g, ' ')}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
