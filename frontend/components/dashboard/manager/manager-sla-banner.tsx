'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export function ManagerSlaBanner({
  atRisk,
  breached,
}: {
  atRisk: number;
  breached: number;
}) {
  if (atRisk <= 0 && breached <= 0) return null;

  const isCritical = breached > 0;

  return (
    <Card className={isCritical
      ? 'mb-6 border-red-900/45 bg-gradient-to-r from-red-950/25 to-card'
      : 'mb-6 border-yellow-900/45 bg-gradient-to-r from-yellow-950/20 to-card'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={isCritical
            ? 'rounded-lg bg-red-950/40 p-2 text-red-300'
            : 'rounded-lg bg-yellow-950/40 p-2 text-yellow-300'}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className={cn('font-medium', isCritical ? 'text-red-100' : 'text-yellow-100')}>
              SLA attention required
            </div>
            <p className={cn('mt-1 text-sm', isCritical ? 'text-red-200/80' : 'text-yellow-200/80')}>
              {atRisk > 0 && `${atRisk} case${atRisk !== 1 ? 's' : ''} at risk`}
              {atRisk > 0 && breached > 0 && ' · '}
              {breached > 0 && `${breached} breached`}
              {' — '}review commitments before client impact.
            </p>
          </div>
        </div>
        <Link href="/app/cases?sla_at_risk=true">
          <Button size="sm" variant={isCritical ? 'primary' : 'secondary'}>
            Review queue
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
