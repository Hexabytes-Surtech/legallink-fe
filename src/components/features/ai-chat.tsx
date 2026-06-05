'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  Sparkles, Send, Loader2, AlertTriangle, Scale, ShieldAlert, ArrowRight, RefreshCw,
  FileText, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { AuthOtpForm } from './auth-otp-form';
import type { AiTurn, AiConnectResult, AiConversationDetail, AiChatPhase } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import { cn } from '@/lib/utils';

// One Bengali codepoint flips the message language (matches the intake detector).
function detectLanguage(text: string): 'en' | 'bn' {
  return /[ঀ-৿]/.test(text) ? 'bn' : 'en';
}

// localStorage / sessionStorage keys.
const LS_CONVERSATION = 'll_ai_cid';
const SS_SEED = 'll_ai_seed';

let _seq = 0;
const nextId = () => `m${++_seq}`;

type Msg =
  | { id: string; role: 'user'; text: string; bn: boolean }
  | { id: string; role: 'assistant'; pending: true }
  | { id: string; role: 'assistant'; pending: false; text?: string; steps?: string[]; error?: string; bn: boolean };

const EXAMPLE_KEYS: TranslationKey[] = ['ask.example.1', 'ask.example.2', 'ask.example.3'];

/**
 * The multi-turn AI legal triage chat. Self-contained: starts a conversation on
 * the first message, replays turns, and surfaces the "connect with a verified
 * advocate" step once the assistant is ready. Anonymous-friendly — registration
 * is only required at the connect step. Used both in the public /assistant route
 * and the citizen console /ask route.
 *
 * A seed message left in sessionStorage by the landing launcher is auto-sent on
 * mount; otherwise the last conversation id in localStorage is resumed.
 */
export function AiChat({
  className,
  autoFocus,
  conversationId,
  controlled = false,
  onConversationCreated,
  onNewChat,
}: {
  className?: string;
  autoFocus?: boolean;
  /** Controlled mode: which conversation to show (null = a fresh, empty chat). */
  conversationId?: string | null;
  /** When true, the parent drives the active conversation (history sidebar). */
  controlled?: boolean;
  /** Fired when a brand-new conversation gets its id (first message). */
  onConversationCreated?: (id: string) => void;
  /** Controlled-mode "new chat" request (parent should clear its selection). */
  onNewChat?: () => void;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [hint, setHint] = React.useState('');
  const [phase, setPhase] = React.useState<AiChatPhase>('triage');
  const [ready, setReady] = React.useState(false);
  const [matterId, setMatterId] = React.useState<string | null>(null);
  const [loadingConv, setLoadingConv] = React.useState(false);
  const [lang, setLang] = React.useState<'en' | 'bn'>(language === 'bn' ? 'bn' : 'en');

  const convIdRef = React.useRef<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const booted = React.useRef(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, ready, phase]);

  // Auto-grow the composer with its content (up to the max-height cap).
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ── send one turn ─────────────────────────────────────────────────────────
  const send = React.useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (busy) return;
    if (!text) { setHint(t('ai.empty')); return; }
    if (text.length > 4000) { setHint(t('ask.long')); return; }
    setHint('');
    setInput('');

    const bn = detectLanguage(text) === 'bn';
    if (!convIdRef.current) setLang(detectLanguage(text)); // first message fixes the convo language

    const pendingId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text, bn },
      { id: pendingId, role: 'assistant', pending: true },
    ]);
    setBusy(true);

    const wasNew = !convIdRef.current;
    try {
      const turn = convIdRef.current
        ? await api.post<AiTurn>(`/ai/conversation/${convIdRef.current}/message`, { message: text })
        : await api.post<AiTurn>('/ai/conversation', { language: detectLanguage(text), message: text });

      convIdRef.current = turn.conversationId;
      // Standalone mode persists the active chat for resume; controlled mode lets
      // the parent (history sidebar) own selection instead.
      if (controlled) {
        if (wasNew) onConversationCreated?.(turn.conversationId);
      } else {
        try { localStorage.setItem(LS_CONVERSATION, turn.conversationId); } catch { /* ignore */ }
      }
      setPhase(turn.phase);
      setReady(turn.readyToConnect);
      setMatterId(turn.matterId);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { id: pendingId, role: 'assistant', pending: false, text: turn.assistantReply, steps: turn.suggestedSteps, bn: turn.assistantReply ? detectLanguage(turn.assistantReply) === 'bn' : bn }
            : m,
        ),
      );
    } catch (err) {
      const msg = errorMessage(err) || t('ai.error');
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { id: pendingId, role: 'assistant', pending: false, error: msg, bn } : m)),
      );
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, input, t, controlled, onConversationCreated]);

  // ── resume an existing conversation ───────────────────────────────────────
  const resume = React.useCallback(async (cid: string) => {
    try {
      const detail = await api.get<AiConversationDetail>(`/ai/conversation/${cid}`);
      if (!detail.messages.length) { convIdRef.current = cid; return; }
      convIdRef.current = detail.conversationId;
      setLang(detail.language);
      setPhase(detail.phase);
      setReady(detail.readyToConnect);
      setMatterId(detail.matterId);
      setMessages(
        detail.messages.map((m) =>
          m.role === 'user'
            ? { id: nextId(), role: 'user' as const, text: m.content, bn: detectLanguage(m.content) === 'bn' }
            : {
                id: nextId(),
                role: 'assistant' as const,
                pending: false as const,
                text: m.content,
                steps: Array.isArray(m.meta?.suggestedSteps) ? (m.meta!.suggestedSteps as string[]) : [],
                bn: detectLanguage(m.content) === 'bn',
              },
        ),
      );
    } catch {
      // Expired / not owned (e.g. claimed by another account) — start fresh.
      try { localStorage.removeItem(LS_CONVERSATION); } catch { /* ignore */ }
    }
  }, []);

  // ── boot (standalone only): auto-send the landing seed, else resume last ──
  React.useEffect(() => {
    if (controlled) return; // controlled mode syncs via the conversationId effect below
    if (booted.current) return;
    booted.current = true;
    let seed: string | null = null;
    try { seed = sessionStorage.getItem(SS_SEED); } catch { /* ignore */ }
    if (seed) {
      try { sessionStorage.removeItem(SS_SEED); } catch { /* ignore */ }
      void send(seed);
      return;
    }
    let cid: string | null = null;
    try { cid = localStorage.getItem(LS_CONVERSATION); } catch { /* ignore */ }
    if (cid) void resume(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetView() {
    convIdRef.current = null;
    setMessages([]);
    setInput('');
    setHint('');
    setPhase('triage');
    setReady(false);
    setMatterId(null);
  }

  // ── controlled mode: follow the parent's selected conversation ────────────
  React.useEffect(() => {
    if (!controlled) return;
    const target = conversationId ?? null;
    if (target === convIdRef.current) return; // already showing it (incl. just-created)
    resetView();
    if (!target) { taRef.current?.focus(); return; }
    convIdRef.current = target;
    setLoadingConv(true);
    void resume(target).finally(() => setLoadingConv(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, controlled]);

  function handleNewChat() {
    if (controlled) { onNewChat?.(); return; }
    try { localStorage.removeItem(LS_CONVERSATION); } catch { /* ignore */ }
    resetView();
    taRef.current?.focus();
  }

  const typedBn = detectLanguage(input) === 'bn' || lang === 'bn';
  const composerDisabled = phase === 'closed';
  const showConnect = ready && phase === 'ready' && !matterId;
  const showEnded = phase === 'closed' && !matterId;     // non-legal: politely closed
  const showConnected = phase === 'closed' && !!matterId; // a matter was created

  // Header status chip — reflects where the conversation is.
  const status: { kind: 'idle' | 'thinking' | 'gathering' | 'ready' | 'connected' | 'ended'; label: string } =
    busy ? { kind: 'thinking', label: t('ai.thinking') }
    : showConnected ? { kind: 'connected', label: t('ai.status.connected') }
    : showEnded ? { kind: 'ended', label: t('ai.status.ended') }
    : ready ? { kind: 'ready', label: t('ai.status.ready') }
    : messages.length > 0 ? { kind: 'gathering', label: t('ai.status.gathering') }
    : { kind: 'idle', label: t('ai.status.online') };

  return (
    <div className={cn('flex h-[calc(100dvh-3.5rem)] flex-col bg-background', className)}>
      {/* Header */}
      <div className="z-10 flex items-center gap-3 border-b border-border bg-card/70 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/20">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base font-semibold leading-tight sm:text-lg">{t('ai.header.title')}</h1>
          <p className="truncate text-xs text-muted-foreground">{t('ai.header.subtitle')}</p>
        </div>
        <StatusChip kind={status.kind} label={status.label} />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleNewChat} className="shrink-0 text-muted-foreground" aria-label={t('ai.closed.newChat')}>
            <RefreshCw className="size-4" /> <span className="hidden sm:inline">{t('ai.closed.newChat')}</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {loadingConv && messages.length === 0 ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-gold" />
            </div>
          ) : messages.length === 0 ? (
            <Welcome t={t} onPick={(q) => void send(q)} />
          ) : (
            messages.map((m) => (
              <ChatRow key={m.id}>
                {m.role === 'user'
                  ? <UserBubble text={m.text} bn={m.bn} />
                  : <AssistantBubble msg={m} t={t} />}
              </ChatRow>
            ))
          )}

          {showConnect && convIdRef.current && (
            <ChatRow><ConnectCard conversationId={convIdRef.current} t={t} router={router} /></ChatRow>
          )}
          {showConnected && matterId && (
            <ChatRow>
              <div className="overflow-hidden rounded-2xl border border-success/40 bg-success/5 shadow-soft">
                <div className="h-1 w-full bg-success/70" />
                <div className="px-4 py-4 sm:px-5">
                  <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
                    <CheckCircle2 className="size-4 text-success" /> {t('ai.connected.title')}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t('ai.connected.body')}</p>
                  <Button asChild size="sm" className="mt-3">
                    <a href={`/matter/${matterId}`}><FileText className="size-4" /> {t('ai.connected.view')} <ArrowRight className="size-4" /></a>
                  </Button>
                </div>
              </div>
            </ChatRow>
          )}
          {showEnded && (
            <ChatRow>
              <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-soft sm:px-5">
                <h3 className="font-display text-sm font-semibold text-foreground">{t('ai.closed.ended.title')}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('ai.closed.ended.body')}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleNewChat}>
                  <RefreshCw className="size-4" /> {t('ai.closed.newChat')}
                </Button>
              </div>
            </ChatRow>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className={cn(
              'flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft transition-colors',
              'focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15',
              composerDisabled && 'pointer-events-none opacity-60',
            )}
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); if (hint) setHint(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              autoFocus={autoFocus}
              disabled={busy || composerDisabled}
              placeholder={composerDisabled ? t('ai.closed.ended.title') : t('ai.placeholder')}
              className={cn(
                'max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
                typedBn && 'font-bn',
              )}
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || composerDisabled || !input.trim()}
              className="shrink-0 transition-transform active:scale-95"
              aria-label={t('ai.send')}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
            {hint
              ? <span className="font-medium text-destructive">{hint}</span>
              : <><ShieldAlert className="size-3 shrink-0 text-muted-foreground/70" /> {t('ai.disclaimer')}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Entrance animation wrapper for each chat row (respects reduced motion). */
function ChatRow({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StatusChip({ kind, label }: { kind: string; label: string }) {
  const dot =
    kind === 'connected' ? 'bg-success'
    : kind === 'ended' ? 'bg-muted-foreground'
    : 'bg-gold';
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:inline-flex">
      <span className={cn('size-1.5 rounded-full', dot, (kind === 'thinking' || kind === 'ready') && 'animate-pulse-glow')} />
      {label}
    </span>
  );
}

function Welcome({ t, onPick }: { t: (k: TranslationKey) => string; onPick: (q: string) => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 flex flex-col items-center gap-5 text-center sm:mt-10"
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-gold/12 text-gold shadow-soft ring-1 ring-inset ring-gold/20 animate-float">
        <Sparkles className="size-8" />
      </span>
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          <span className="text-gradient-gold">{t('ai.welcome.title')}</span>
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t('ai.welcome.hint')}</p>
      </div>
      <div className="mt-1 grid w-full max-w-md gap-2.5">
        {EXAMPLE_KEYS.map((k, i) => (
          <ExampleCard key={k} index={i} onClick={() => onPick(t(k))} label={t(k)} />
        ))}
      </div>
    </motion.div>
  );
}

function ExampleCard({ index, onClick, label }: { index: number; onClick: () => void; label: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: reduce ? 0 : 0.15 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground/90 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lift"
      >
        <span>{label}</span>
        <ArrowRight className="size-4 shrink-0 -translate-x-1 text-gold opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </button>
    </motion.div>
  );
}

function UserBubble({ text, bn }: { text: string; bn: boolean }) {
  return (
    <div className="flex justify-end">
      <div className={cn('max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-soft sm:max-w-[80%]', bn && 'font-bn')}>
        {text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-gold/70"
          style={{ animationDelay: `${i * 140}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  );
}

function AssistantBubble({ msg, t }: { msg: Extract<Msg, { role: 'assistant' }>; t: (k: TranslationKey) => string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 text-gold ring-1 ring-inset ring-gold/20">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        {msg.pending ? (
          <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
            <TypingDots /> <span>{t('ai.thinking')}</span>
          </div>
        ) : msg.error ? (
          <div className="rounded-2xl rounded-tl-md border border-destructive/40 bg-card px-4 py-3 text-sm text-foreground shadow-soft">
            <span className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-4" /> {msg.error}</span>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5 shadow-soft">
            <div className={cn('space-y-2.5 text-sm leading-relaxed text-foreground/90', msg.bn && 'font-bn')}>
              {(msg.text ?? '').split('\n').filter((l) => l.trim()).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            {msg.steps && msg.steps.length > 0 && (
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">{t('ai.steps.title')}</p>
                <ul className={cn('space-y-1.5 text-sm text-foreground/90', msg.bn && 'font-bn')}>
                  {msg.steps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-gold" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectCard({
  conversationId, t, router,
}: {
  conversationId: string;
  t: (k: TranslationKey) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const doConnect = React.useCallback(async () => {
    setBusy(true);
    try {
      const res = await api.post<AiConnectResult>(`/ai/conversation/${conversationId}/connect`, {});
      try { localStorage.removeItem(LS_CONVERSATION); } catch { /* ignore */ }
      toast.success(t('ai.connected.title'));
      router.push(`/matter/${res.matterId}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }, [conversationId, router, t]);

  const canConnectDirectly = isAuthenticated && user?.role === 'citizen';

  return (
    <div className="overflow-hidden rounded-2xl border border-gold/30 bg-gold/[0.06] shadow-soft glow-gold">
      <div className="h-1 w-full bg-brand-gradient" />
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold ring-1 ring-inset ring-gold/25 animate-pulse-glow">
            <Scale className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-semibold text-foreground">{t('ai.connect.title')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('ai.connect.body')}</p>

            {canConnectDirectly ? (
              <Button className="mt-3 transition-transform active:scale-[0.98]" disabled={busy} onClick={() => void doConnect()}>
                {busy
                  ? <><Loader2 className="size-4 animate-spin" /> {t('ai.connect.connecting')}</>
                  : <><Scale className="size-4" /> {t('ai.connect.cta')} <ArrowRight className="size-4" /></>}
              </Button>
            ) : isAuthenticated ? (
              <p className="mt-3 text-sm text-muted-foreground">Only citizen accounts can connect with an advocate.</p>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="mt-3 transition-transform active:scale-[0.98]"><Scale className="size-4" /> {t('ai.connect.cta')} <ArrowRight className="size-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('ai.connect.title')}</DialogTitle>
                    <DialogDescription>{t('ai.connect.register')}</DialogDescription>
                  </DialogHeader>
                  <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-foreground/80">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                    {t('ai.disclaimer')}
                  </p>
                  <AuthOtpForm
                    mode="signup"
                    redirectTo={false}
                    onAuthenticated={async () => { await doConnect(); }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
