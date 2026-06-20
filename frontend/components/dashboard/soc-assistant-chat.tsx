'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatMessageContent } from '@/components/dashboard/chat-message-content';
import { cn } from '@/lib/utils';
import { Bot, Loader2, MessageCircle, Send, Sparkles, User } from 'lucide-react';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiStatus = {
  enabled: boolean;
  provider: string;
  model: string | null;
};

type ChatApiResponse = {
  reply: string;
  source?: string;
};

export function SocAssistantChat({
  endpoint,
  buildBody,
  suggestedQuestions,
  welcomeMessage,
  title = 'SOC Assistant',
  subtitle = 'Ask questions about your dashboard data — powered by AI.',
  placeholder = 'Ask a question…',
  layout = 'inline',
  className,
}: {
  endpoint: string;
  buildBody: (message: string, history: ChatMessage[]) => Record<string, unknown>;
  suggestedQuestions: string[];
  welcomeMessage: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  layout?: 'inline' | 'sidebar';
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: welcomeMessage },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<AiStatus>('/dashboards/ai-status')
      .then(setAiStatus)
      .catch(() => setAiStatus({ enabled: false, provider: 'mock', model: null }));
  }, []);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;

    setError('');
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10);

      const res = await api<ChatApiResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(buildBody(message, history)),
      });

      if (res.source === 'openai') {
        setAiStatus((prev) => ({
          enabled: true,
          provider: 'openai',
          model: prev?.model ?? null,
        }));
      }

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
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {aiStatus && (
                <span className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                  aiStatus.enabled
                    ? 'border-green-900/40 bg-green-950/25 text-green-300'
                    : 'border-border bg-background/60 text-muted',
                )}>
                  {aiStatus.enabled ? 'Live AI' : 'Demo mode'}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted xl:text-sm">
              {aiStatus?.enabled && aiStatus.model
                ? `${subtitle} Model: ${aiStatus.model}.`
                : subtitle}
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
            className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
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
          {suggestedQuestions.map((q) => (
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
              placeholder={placeholder}
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
