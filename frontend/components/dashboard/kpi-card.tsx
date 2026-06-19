'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const CHART_COLORS = ['#1d9bf0', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#71767b'];

export const tooltipStyle = { background: '#1a1f26', border: '1px solid #2f3336', borderRadius: 8 };

export type KpiTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
}) {
  const toneStyles: Record<KpiTone, string> = {
    default: 'border-border',
    primary: 'border-primary/40 bg-primary/5',
    success: 'border-green-900/40 bg-green-900/10',
    warning: 'border-yellow-900/40 bg-yellow-900/10',
    danger: 'border-red-900/40 bg-red-900/10',
  };
  const iconStyles: Record<KpiTone, string> = {
    default: 'text-muted',
    primary: 'text-primary',
    success: 'text-green-400',
    warning: 'text-yellow-300',
    danger: 'text-red-400',
  };

  return (
    <Card className={cn('relative overflow-hidden', toneStyles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        <div className={cn('rounded-lg bg-background/60 p-2', iconStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
    </div>
  );
}

export function ComponentBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{value}% <span className="text-muted">({weight})</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
