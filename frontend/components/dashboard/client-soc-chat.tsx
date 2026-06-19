'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessageContent } from '@/components/dashboard/chat-message-content';
import { cn } from '@/lib/utils';
import { Bot, Loader2, MessageCircle, Send, Sparkles, User } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: clientName
        ? `Hi — I can answer questions about **${clientName}**'s security operations for the last **${periodDays} days**.\n\nTry asking about:\n- SLA performance\n- Open cases and incidents\n- Your SOC workflow funnel`
        : `Hi — ask me about your security operations, SLA performance, cases, and incidents.\n\nTry asking about:\n- SLA performance\n- Open cases\n- Notable incidents`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;

    setError('');
    setLoading(true);
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api<{ reply: string }>(`/dashboards/client/${clientId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, history, period_days: periodDays }),
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get a response');
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  const isSidebar = layout === 'sidebar';

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden border-primary/20',
        isSidebar ? 'max-h-[calc(100vh-5.5rem)]' : 'mt-6',
        className,
      )}
    >
      <div className="shrink-0 border-b border-border bg-primary/5 px-4 py-3 xl:px-5 xl:py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">SOC Assistant</h3>
            <p className="mt-1 text-xs text-muted xl:text-sm">
              {isSidebar
                ? 'Ask about the dashboard data as you review it below.'
                : 'Ask questions about your security operations — powered by AI using your dashboard data.'}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 xl:px-5',
          !isSidebar && 'max-h-96',
        )}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-border text-muted',
              )}
            >
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background/60',
              )}
            >
              <ChatMessageContent content={msg.content} variant={msg.role} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 xl:px-5">
        <div className={cn('mb-3 flex flex-wrap gap-2', isSidebar && 'flex-col items-stretch')}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={loading}
              className={cn(
                'rounded-full border border-border bg-card px-3 py-1 text-left text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50',
                isSidebar && 'rounded-lg px-2.5 py-1.5',
              )}
            >
              {q}
            </button>
          ))}
        </div>
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="relative flex-1">
            <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your SOC activity, SLA, or incidents…"
              disabled={loading}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>
          <Button type="submit" size="sm" disabled={loading || !input.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
