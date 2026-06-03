'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, FileText, Scale, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { displayPracticeArea } from '@/lib/practice-areas';
import type { MatterDetail } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import { cn } from '@/lib/utils';

// One Bengali codepoint flips the query language (matches the intake detector).
function detectLanguage(text: string): 'en' | 'bn' {
  return /[ঀ-৿]/.test(text) ? 'bn' : 'en';
}

function analysisText(m: MatterDetail): string | null {
  const ai = m.aiResponse;
  if (!ai) return null;
  return m.language === 'bn'
    ? ai.responseBengali ?? ai.responseEnglish ?? null
    : ai.responseEnglish ?? ai.responseBengali ?? null;
}

type Msg =
  | { id: string; role: 'user'; text: string; bn: boolean }
  | { id: string; role: 'assistant'; pending: true }
  | { id: string; role: 'assistant'; pending: false; matter?: MatterDetail; error?: string };

type AssistantMsg = Extract<Msg, { role: 'assistant' }>;

let _seq = 0;
const nextId = () => `m${++_seq}`;

const EXAMPLE_KEYS: TranslationKey[] = ['ask.example.1', 'ask.example.2', 'ask.example.3'];

export default function AskAiPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [hint, setHint] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (busy) return;
    if (text.length < 20) {
      setHint(t('ask.short'));
      return;
    }
    if (text.length > 2000) {
      setHint(t('ask.long'));
      return;
    }
    setHint('');
    setInput('');

    const bn = detectLanguage(text) === 'bn';
    const pendingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text, bn },
      { id: pendingId, role: 'assistant', pending: true },
    ]);
    setBusy(true);

    try {
      const matter = await api.post<MatterDetail>('/matter', { query: text, language: detectLanguage(text) });
      try { localStorage.setItem('ll_last_matter_id', matter.matterId); } catch { /* ignore */ }
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { id: pendingId, role: 'assistant', pending: false, matter } : m)),
      );
    } catch (err) {
      const msg = errorMessage(err) || t('ask.error');
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { id: pendingId, role: 'assistant', pending: false, error: msg } : m)),
      );
    } finally {
      setBusy(false);
    }
  }

  const typedBn = detectLanguage(input) === 'bn' || language === 'bn';

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 sm:px-6">
        <span className="grid size-9 place-items-center rounded-xl bg-gold/12 text-gold">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight">{t('ask.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('ask.subtitle')}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 ? (
            <Welcome t={t} onPick={(q) => send(q)} />
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} text={m.text} bn={m.bn} />
              ) : (
                <AssistantBubble key={m.id} msg={m} t={t} />
              ),
            )
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft"
          >
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (hint) setHint(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              disabled={busy}
              placeholder={t('ask.placeholder')}
              className={cn(
                'max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground',
                typedBn && 'font-bn',
              )}
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim()} className="shrink-0" aria-label={t('ask.send')}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            {hint ? <span className="font-medium text-destructive">{hint}</span> : t('ask.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ t, onPick }: { t: (k: TranslationKey) => string; onPick: (q: string) => void }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-gold/12 text-gold animate-pulse-glow">
        <Sparkles className="size-7" />
      </span>
      <div>
        <h2 className="font-display text-xl font-semibold">{t('ask.welcome.title')}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t('ask.welcome.hint')}</p>
      </div>
      <div className="mt-2 flex w-full max-w-md flex-col gap-2">
        {EXAMPLE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(t(k))}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground/90 shadow-soft transition-colors hover:border-gold/50 hover:bg-accent"
          >
            {t(k)}
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text, bn }: { text: string; bn: boolean }) {
  return (
    <div className="flex justify-end">
      <div className={cn('max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground', bn && 'font-bn')}>
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ msg, t }: { msg: AssistantMsg; t: (k: TranslationKey) => string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 text-gold">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        {msg.pending ? (
          <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
            <Loader2 className="size-4 animate-spin text-gold" /> {t('ask.thinking')}
          </div>
        ) : msg.error ? (
          <div className="rounded-2xl rounded-tl-md border border-destructive/40 bg-card px-4 py-3 text-sm text-foreground shadow-soft">
            <span className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-4" /> {t('ask.error')}</span>
          </div>
        ) : msg.matter ? (
          <AssistantAnswer matter={msg.matter} t={t} />
        ) : null}
      </div>
    </div>
  );
}

function AssistantAnswer({ matter, t }: { matter: MatterDetail; t: (k: TranslationKey) => string }) {
  const text = analysisText(matter);
  const isBn = matter.language === 'bn';
  const matterType = matter.aiResponse?.classification?.matterType;
  const disclaimer = matter.aiResponse?.disclaimer;

  if (!text) {
    return (
      <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-foreground shadow-soft">
        {t('ask.error')}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5 shadow-soft">
      {matterType && (
        <Badge variant="gold">{displayPracticeArea(matterType)}</Badge>
      )}
      <div className={cn('space-y-2.5 text-sm leading-relaxed text-foreground/90', isBn && 'font-bn')}>
        {text.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {disclaimer && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" /> {disclaimer}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button asChild size="sm" variant="outline">
          <Link href={`/matter/${matter.matterId}`}><FileText className="size-4" /> {t('ask.viewAnalysis')}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/advocates"><Scale className="size-4" /> {t('ask.findAdvocates')} <ArrowRight className="size-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
