'use client';

import { CasesByPriorityChart, type PriorityChartDatum } from '@/components/dashboard/manager/priority-chart';
import { CasesByStatusChart, type StatusChartDatum } from '@/components/dashboard/manager/status-chart';
import { AnalystWorkloadChart, type WorkloadChartDatum } from '@/components/dashboard/manager/workload-chart';
import { SlaAtRiskPanel } from '@/components/dashboard/manager/sla-at-risk-panel';
import type { Case } from '@/types';

export function ManagerAnalyticsSection({
  priorityData,
  statusData,
  workloadData,
  atRiskCases,
}: {
  priorityData: PriorityChartDatum[];
  statusData: StatusChartDatum[];
  workloadData: WorkloadChartDatum[];
  atRiskCases: Case[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
      <div className="flex flex-col gap-4 xl:col-span-2">
        <CasesByPriorityChart data={priorityData} />
        <AnalystWorkloadChart data={workloadData} />
      </div>

      <div className="flex flex-col gap-4">
        <CasesByStatusChart data={statusData} />
        <SlaAtRiskPanel cases={atRiskCases} />
      </div>
    </div>
  );
}
