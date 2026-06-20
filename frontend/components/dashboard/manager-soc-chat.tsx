'use client';

import { SocAssistantChat } from '@/components/dashboard/soc-assistant-chat';

const SUGGESTED_QUESTIONS = [
  'What is our SLA status?',
  'How is analyst workload distributed?',
  'Summarize open queue by priority',
  'How is AI acceptance trending?',
];

export function ManagerSocChat({ layout = 'sidebar', className }: {
  layout?: 'inline' | 'sidebar';
  className?: string;
}) {
  return (
    <SocAssistantChat
      endpoint="/dashboards/soc-manager/chat"
      buildBody={(message, history) => ({ message, history })}
      suggestedQuestions={SUGGESTED_QUESTIONS}
      welcomeMessage={
        'Hi — I can answer questions about **queue health**, **SLA governance**, **analyst workload**, and **AI/QA indicators** on this dashboard.\n\nTry asking about:\n- SLA at risk and breached cases\n- Analyst capacity and assignments\n- AI acceptance and override rates\n- Cases needing QA review'
      }
      title="SOC Manager Assistant"
      subtitle="Ask about operations, SLA, workload, and AI decision quality as you review the dashboard."
      placeholder="Ask about queue health, SLA, workload, or AI metrics…"
      layout={layout}
      className={className}
    />
  );
}
