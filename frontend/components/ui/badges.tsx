'use client';

import { Badge, severityVariant, slaVariant } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge variant={severityVariant(severity)}>{severity}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <Badge>Unset</Badge>;
  const variant = priority.startsWith('P1') ? 'critical' : priority.startsWith('P2') ? 'high' : priority.startsWith('P3') ? 'medium' : 'low';
  return <Badge variant={variant}>{priority}</Badge>;
}

export function SlaBadge({ status }: { status: string | null }) {
  return <Badge variant={slaVariant(status)}>{status || 'Unknown'}</Badge>;
}

export function AiConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <Badge>—</Badge>;
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  return <Badge variant={variant}>AI {score}%</Badge>;
}

export function AgreementBadge({ agreed }: { agreed: boolean | null }) {
  if (agreed == null) return <Badge>Pending</Badge>;
  return <Badge variant={agreed ? 'success' : 'warning'}>{agreed ? 'AI Agreed' : 'AI Override'}</Badge>;
}

export function AiActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    Accepted: 'success',
    Modified: 'warning',
    Rejected: 'danger',
    Escalated: 'high',
    'Not Used': 'default',
  };
  return <Badge variant={colors[action] || 'default'}>{action}</Badge>;
}

export function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2 border-b border-border pb-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
