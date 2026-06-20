'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ManagerChartPanel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="mb-4 flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-start gap-2.5">
          {Icon && (
            <div className="shrink-0 rounded-lg bg-primary/10 p-1.5 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
