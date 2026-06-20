'use client';

import { SocAssistantChat } from '@/components/dashboard/soc-assistant-chat';

const SUGGESTED_QUESTIONS = [
  'Explain our trust calibration score',
  'How is AI acceptance trending?',
  'What are the top override reasons?',
  'Summarize this for a QBR',
];

export function TrustMetricsSocChat({
  clientId,
  startDate,
  endDate,
  clientLabel,
  layout = 'sidebar',
  className,
}: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  clientLabel?: string;
  layout?: 'inline' | 'sidebar';
  className?: string;
}) {
  const scopeHint = clientLabel || 'All clients';

  return (
    <SocAssistantChat
      endpoint="/dashboards/trust-metrics/chat"
      buildBody={(message, history) => ({
        message,
        history,
        client_id: clientId || null,
        start_date: startDate || null,
        end_date: endDate || null,
      })}
      suggestedQuestions={SUGGESTED_QUESTIONS}
      welcomeMessage={
        `Hi — I can answer questions about **trust calibration**, **AI alignment**, **override patterns**, **confidence signals**, and **QA oversight** for the metrics on this page.\n\n`
        + `Current scope: **${scopeHint}**`
        + `${startDate || endDate ? ` (${startDate || '…'} → ${endDate || '…'})` : ''}.\n\n`
        + 'Try asking about:\n'
        + '- What drives the calibration score\n'
        + '- Acceptance vs agreement rates\n'
        + '- Override reasons and analyst patterns\n'
        + '- QBR-ready executive summary'
      }
      title="Trust Metrics Assistant"
      subtitle="Ask about human-AI quality, calibration, overrides, and trends for the active filter scope."
      placeholder="Ask about calibration, alignment, overrides, or QBR talking points…"
      layout={layout}
      className={className}
    />
  );
}
