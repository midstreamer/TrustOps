'use client';

import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  onClick,
  role,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  role?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)} onClick={onClick} role={role}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground">{children}</h3>;
}

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: string }) {
  const colors: Record<string, string> = {
    default: 'bg-border text-foreground',
    critical: 'bg-red-900/50 text-red-300',
    high: 'bg-orange-900/50 text-orange-300',
    medium: 'bg-yellow-900/50 text-yellow-300',
    low: 'bg-green-900/50 text-green-300',
    success: 'bg-green-900/50 text-green-300',
    warning: 'bg-yellow-900/50 text-yellow-300',
    danger: 'bg-red-900/50 text-red-300',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', colors[variant] || colors.default)}>
      {children}
    </span>
  );
}

export function severityVariant(s: string) {
  const m: Record<string, string> = {
    Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low', Informational: 'default',
  };
  return m[s] || 'default';
}

export function slaVariant(s: string | null) {
  if (!s) return 'default';
  if (s === 'Breached') return 'danger';
  if (s === 'At Risk') return 'warning';
  if (s === 'Met') return 'success';
  return 'default';
}
