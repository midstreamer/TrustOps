'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';
import {
  Calendar, ChevronRight, Filter, RefreshCw, SlidersHorizontal, Users, X,
} from 'lucide-react';

type DatePreset = '30d' | '90d' | 'month' | 'all';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

function formatDisplayDate(iso: string) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDatePreset(preset: DatePreset) {
  const end = new Date();
  const start = new Date();
  if (preset === 'all') return { start: '', end: '' };
  if (preset === '30d') start.setDate(end.getDate() - 30);
  else if (preset === '90d') start.setDate(end.getDate() - 90);
  else if (preset === 'month') start.setDate(1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function detectPreset(startDate: string, endDate: string): DatePreset | null {
  if (!startDate && !endDate) return 'all';
  for (const preset of DATE_PRESETS) {
    if (preset.id === 'all') continue;
    const { start, end } = getDatePreset(preset.id);
    if (start === startDate && end === endDate) return preset.id;
  }
  return null;
}

const filterControlClass =
  'border-border/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70';

function FilterField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border/70 bg-background/40 p-3', className)}>
      <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}

export function TrustMetricsFilters({
  clients,
  clientId,
  startDate,
  endDate,
  clientLabel,
  decisionCount,
  loading,
  onClientChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  onApply,
}: {
  clients: Client[];
  clientId: string;
  startDate: string;
  endDate: string;
  clientLabel: string;
  decisionCount?: number;
  loading: boolean;
  onClientChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const hasFilters = Boolean(clientId || startDate || endDate);
  const activePreset = detectPreset(startDate, endDate);
  const activeFilterCount = [clientId, startDate || endDate].filter(Boolean).length;

  const applyPreset = (preset: DatePreset) => {
    const { start, end } = getDatePreset(preset);
    onStartDateChange(start);
    onEndDateChange(end);
  };

  const dateRangeLabel = startDate || endDate
    ? `${startDate ? formatDisplayDate(startDate) : '…'} → ${endDate ? formatDisplayDate(endDate) : '…'}`
    : 'All time';

  return (
    <Card className="mb-6 overflow-hidden border-purple-900/20 bg-gradient-to-br from-purple-950/10 via-card to-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-purple-500/15 p-2 text-purple-300">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">Filters</h3>
              {activeFilterCount > 0 && (
                <span className="rounded-full border border-purple-900/35 bg-purple-950/20 px-2 py-0.5 text-[10px] font-medium text-purple-200">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted">Scope trust metrics by client and reporting period</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasFilters && (
            <Button variant="secondary" size="sm" onClick={onClear} disabled={loading}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
          <Button size="sm" onClick={onApply} disabled={loading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
            {loading ? 'Applying…' : 'Apply filters'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FilterField label="Client" icon={Users}>
          <Select
            value={clientId}
            onChange={(e) => onClientChange(e.target.value)}
            className={filterControlClass}
          >
            <option value="">All clients ({clients.length})</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FilterField>

        <FilterField label="Start date" icon={Calendar}>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={filterControlClass}
          />
        </FilterField>

        <FilterField label="End date" icon={Calendar}>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={filterControlClass}
          />
        </FilterField>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          <Filter className="h-3 w-3" />
          Quick ranges
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              disabled={loading}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                activePreset === preset.id
                  ? 'border-purple-900/40 bg-purple-950/25 text-purple-200'
                  : 'border-border bg-background/50 text-muted hover:border-primary/40 hover:text-primary',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border/60 bg-background/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Active scope</span>
          {decisionCount != null && (
            <span className="text-[11px] tabular-nums text-muted">{decisionCount} decisions</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
            <Users className="h-3 w-3" />
            {clientLabel}
            {clientId && (
              <button
                type="button"
                onClick={() => onClientChange('')}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary/15"
                aria-label="Clear client filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted">
            <Calendar className="h-3 w-3" />
            {dateRangeLabel}
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  onStartDateChange('');
                  onEndDateChange('');
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-border"
                aria-label="Clear date filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>

          {decisionCount != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-900/35 bg-green-950/15 px-2.5 py-1 text-xs text-green-300">
              <ChevronRight className="h-3 w-3" />
              {decisionCount} in range
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
