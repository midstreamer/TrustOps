'use client';

import { cn } from '@/lib/utils';

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', lines: [...paragraph] });
      paragraph = [];
    }
  };
  const flushUl = () => {
    if (ul.length) {
      blocks.push({ type: 'ul', items: [...ul] });
      ul = [];
    }
  };
  const flushOl = () => {
    if (ol.length) {
      blocks.push({ type: 'ol', items: [...ol] });
      ol = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushUl();
    flushOl();
  };

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }

    const bullet = line.match(/^[-•*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushOl();
      ul.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      flushUl();
      ol.push(numbered[1]);
      continue;
    }

    flushUl();
    flushOl();
    paragraph.push(line);
  }
  flushAll();
  return blocks;
}

function InlineText({ text, variant }: { text: string; variant: 'user' | 'assistant' }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\d+(?:\.\d+)?%)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className={variant === 'user' ? 'font-semibold' : 'font-semibold text-foreground'}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (/^\d+(?:\.\d+)?%$/.test(part)) {
          return (
            <span
              key={i}
              className={cn(
                'font-semibold tabular-nums',
                variant === 'user' ? 'text-primary-foreground' : 'text-primary',
              )}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChatMessageContent({
  content,
  variant,
}: {
  content: string;
  variant: 'user' | 'assistant';
}) {
  if (variant === 'user') {
    return (
      <div className="space-y-2">
        {content.split('\n').map((line, i) => (
          <p key={i} className="leading-relaxed">
            <InlineText text={line} variant="user" />
          </p>
        ))}
      </div>
    );
  }

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <div key={i} className="space-y-2 text-foreground/90">
              {block.lines.map((line, j) => (
                <p key={j}>
                  <InlineText text={line} variant="assistant" />
                </p>
              ))}
            </div>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="space-y-2 border-l-2 border-primary/30 pl-3">
              {block.items.map((item, j) => (
                <li key={j} className="relative pl-1 text-foreground/90">
                  <span className="absolute -left-3 top-2 h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
                  <InlineText text={item} variant="assistant" />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol key={i} className="list-decimal space-y-2 pl-5 text-foreground/90 marker:text-primary/80">
            {block.items.map((item, j) => (
              <li key={j} className="pl-1">
                <InlineText text={item} variant="assistant" />
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
