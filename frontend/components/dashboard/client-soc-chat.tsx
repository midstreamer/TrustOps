'use client';

import { SocAssistantChat } from '@/components/dashboard/soc-assistant-chat';

const SUGGESTED_QUESTIONS = [
  'How is our SLA performance?',
  'How many open cases do we have?',
  'Summarize our SOC workflow funnel',
  'What notable incidents should I know about?',
];

export function ClientSocChat({
  clientId,
  periodDays,
  clientName,
  layout = 'inline',
  className,
}: {
  clientId: string;
  periodDays: number;
  clientName?: string | null;
  layout?: 'inline' | 'sidebar';
  className?: string;
}) {
  return (
    <SocAssistantChat
      endpoint={`/dashboards/client/${clientId}/chat`}
      buildBody={(message, history) => ({ message, history, period_days: periodDays })}
      suggestedQuestions={SUGGESTED_QUESTIONS}
      welcomeMessage={
        clientName
          ? `Hi — I can answer questions about **${clientName}**'s security operations for the last **${periodDays} days**.\n\nTry asking about:\n- SLA performance\n- Open cases and incidents\n- Your SOC workflow funnel`
          : `Hi — ask me about your security operations, SLA performance, cases, and incidents.\n\nTry asking about:\n- SLA performance\n- Open cases\n- Notable incidents`
      }
      title="SOC Assistant"
      subtitle={
        layout === 'sidebar'
          ? 'Ask about the dashboard data as you review it below.'
          : 'Ask questions about your security operations — powered by AI using your dashboard data.'
      }
      placeholder="Ask about your SOC activity, SLA, or incidents…"
      layout={layout}
      className={className}
    />
  );
}
