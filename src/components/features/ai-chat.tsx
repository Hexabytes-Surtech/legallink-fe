'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles, Send, Loader2, AlertTriangle, Scale, ShieldAlert, ArrowRight, RefreshCw,
  FileText, CheckCircle2, Mic, Search, BookOpen, ExternalLink, ChevronDown, Brain,
  Phone, Siren,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, streamPost } from '@/lib/api/client';
import { Markdown, MarkdownInline } from '@/lib/markdown';
import { errorMessage } from '@/hooks/useApi';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { VoiceRecorderBar } from './voice-recorder-bar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { AuthOtpForm } from './auth-otp-form';
import type { AiConnectResult, AiConversationDetail, AiChatPhase } from '@/types';
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

/** A retrieved statute/judgment citation — the Perplexity-style "source". */
export type Source = {
  citation: string;
  section?: string | null;
  text?: string;
  url?: string | null;
  unitId?: string;
  sourceType?: string;
};

/** One agent step in the live "thinking" trail (analyze → search → write). */
type ProcessStep = { phase: string; label: string; done: boolean };

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Normalise both the streamed `source` shape (snake_case from RAG) and the
 *  stored `citations` shape (camelCase from the BE) into one Source. */
function toSource(raw: Record<string, unknown>): Source {
  return {
    citation: str(raw.citation) ?? str(raw.doc_title) ?? str(raw.caseName) ?? 'Source',
    section: str(raw.section) ?? null,
    text: str(raw.text) ?? '',
    url: str(raw.url) ?? str(raw.uri) ?? null,
    unitId: str(raw.unitId) ?? str(raw.unit_id),
    sourceType: str(raw.sourceType) ?? str(raw.source_type) ?? str(raw.source),
  };
}

type Contact = { label: string; number: string };

type AssistantMsg = {
  id: string;
  role: 'assistant';
  pending: boolean;     // no answer prose has arrived yet
  streaming: boolean;   // the SSE stream is still open
  text: string;         // accumulated answer prose
  process: ProcessStep[]; // live agent steps
  sources: Source[];    // retrieved citations (numbered chips)
  steps: string[];      // suggested next steps (final)
  immediate: boolean;   // immediate-help mode (active danger) → urgent card
  emergencyContacts: Contact[]; // dial-able numbers (immediate mode only)
  error?: string;
  bn: boolean;
};

type Msg =
  | { id: string; role: 'user'; text: string; bn: boolean }
  | AssistantMsg;

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

  // ── voice typing (record → Gemini transcription) ─────────────────────────
  // Records the whole clip locally, then sends it once to Gemini (using the FE
  // key), so nothing is lost to network lag the way the live Web Speech API
  // did. The recogniser language follows the conversation (English / Bengali).
  const voiceLang: 'en' | 'bn' = detectLanguage(input) === 'bn' || lang === 'bn' ? 'bn' : 'en';
  const {
    supported: micSupported,
    status: voiceStatus,
    seconds: voiceSeconds,
    stream: voiceStream,
    start: startDictation,
    stop: stopDictation,
    cancel: cancelDictation,
  } = useVoiceTranscription({
    lang: voiceLang,
    onResult: (text) => {
      // Append the transcribed words onto whatever was already typed.
      setInput((prev) => prev + (prev && !/\s$/.test(prev) ? ' ' : '') + text);
      if (hint) setHint('');
    },
    onError: (kind) => {
      toast.error(
        kind === 'not-allowed' ? t('ai.voice.denied')
          : kind === 'insecure' ? t('ai.voice.insecure')
            : kind === 'no-mic' ? t('ai.voice.nomic')
              : kind === 'network' ? t('ai.voice.network')
                : kind === 'rejected' ? t('ai.voice.rejected')
                  : kind === 'empty' ? t('ai.voice.empty')
                    : t('ai.voice.error'),
      );
    },
  });

  const voiceActive = voiceStatus !== 'idle';

  // ── send one turn ─────────────────────────────────────────────────────────
  const send = React.useCallback(async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (busy) return;
    cancelDictation(); // discard any in-progress recording
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
      { id: pendingId, role: 'assistant', pending: true, streaming: true, text: '', process: [], sources: [], steps: [], immediate: false, emergencyContacts: [], bn },
    ]);
    setBusy(true);

    // Mutate just the in-flight assistant message (keeps every other row intact).
    const patch = (fn: (a: AssistantMsg) => AssistantMsg) =>
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId && m.role === 'assistant' ? fn(m) : m)),
      );

    try {
      // The stream endpoint operates on an existing conversation — create one first.
      let cid = convIdRef.current;
      if (!cid) {
        const detail = await api.post<AiConversationDetail>('/ai/conversation', {
          language: detectLanguage(text),
        });
        cid = detail.conversationId;
        convIdRef.current = cid;
        if (controlled) onConversationCreated?.(cid);
        else { try { localStorage.setItem(LS_CONVERSATION, cid); } catch { /* ignore */ } }
      }

      await streamPost(`/ai/conversation/${cid}/message/stream`, { message: text }, (event, data) => {
        if (event === 'step') {
          // Mark the prior step complete; the newest step is the active (spinning) one.
          const label = (str(data.label) ?? '').trim();
          if (!label) return;
          patch((m) => ({
            ...m,
            process: [
              ...m.process.map((p) => ({ ...p, done: true })),
              { phase: str(data.phase) ?? '', label, done: false },
            ],
          }));
        } else if (event === 'source') {
          const s = toSource(data);
          patch((m) =>
            m.sources.some((x) => (x.unitId && x.unitId === s.unitId) || (x.url && x.url === s.url))
              ? m
              : { ...m, sources: [...m.sources, s] },
          );
        } else if (event === 'token') {
          const chunk = str(data.text) ?? '';
          // First token: the agent steps are done, the answer begins.
          patch((m) => ({
            ...m,
            pending: false,
            text: m.text + chunk,
            process: m.process.map((p) => ({ ...p, done: true })),
          }));
        } else if (event === 'done') {
          setPhase((str(data.phase) as AiChatPhase | undefined) ?? 'triage');
          setReady(data.readyToConnect === true);
          setMatterId(str(data.matterId) ?? null);
          const reply = str(data.assistantReply) ?? '';
          const citations = Array.isArray(data.citations) ? (data.citations as Record<string, unknown>[]) : [];
          const steps = Array.isArray(data.suggestedSteps) ? (data.suggestedSteps as string[]) : [];
          const immediate = data.responseMode === 'immediate_help';
          const contacts = Array.isArray(data.emergencyContacts)
            ? (data.emergencyContacts as Contact[]).filter((e) => e && e.label && e.number)
            : [];
          patch((m) => ({
            ...m,
            pending: false,
            streaming: false,
            text: m.text || reply,
            steps,
            sources: m.sources.length ? m.sources : citations.map(toSource),
            process: m.process.map((p) => ({ ...p, done: true })),
            immediate,
            emergencyContacts: contacts,
            bn: reply ? detectLanguage(reply) === 'bn' : m.bn,
          }));
        } else if (event === 'error') {
          patch((m) => ({ ...m, pending: false, streaming: false, error: str(data.message) ?? 'error' }));
        }
      });
    } catch (err) {
      const msg = errorMessage(err) || t('ai.error');
      patch((m) => ({ ...m, pending: false, streaming: false, error: m.error ?? msg }));
    } finally {
      setBusy(false);
      patch((m) => (m.streaming ? { ...m, streaming: false, pending: false } : m));
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
                pending: false,
                streaming: false,
                text: m.content,
                process: [],
                sources: Array.isArray(m.meta?.citations) ? (m.meta!.citations as Record<string, unknown>[]).map(toSource) : [],
                steps: Array.isArray(m.meta?.suggestedSteps) ? (m.meta!.suggestedSteps as string[]) : [],
                immediate: m.meta?.responseMode === 'immediate_help',
                emergencyContacts: Array.isArray(m.meta?.emergencyContacts)
                  ? (m.meta!.emergencyContacts as Contact[]).filter((e) => e && e.label && e.number)
                  : [],
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
    cancelDictation();
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
    cancelDictation();
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
            {voiceActive ? (
              <VoiceRecorderBar
                status={voiceStatus}
                seconds={voiceSeconds}
                stream={voiceStream}
                onCancel={cancelDictation}
                onStop={stopDictation}
              />
            ) : (
              <>
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
                {micSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={startDictation}
                    disabled={busy || composerDisabled}
                    aria-label={t('ai.voice.start')}
                    title={t('ai.voice.start')}
                    className="shrink-0 text-muted-foreground transition-transform active:scale-95"
                  >
                    <Mic className="size-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  size="icon"
                  disabled={busy || composerDisabled || !input.trim()}
                  className="shrink-0 transition-transform active:scale-95"
                  aria-label={t('ai.send')}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </>
            )}
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

/** Tap-to-call emergency numbers, shown at the top of an immediate-help card. */
function EmergencyContacts({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {contacts.map((c, i) => (
        <a
          key={i}
          href={`tel:${c.number.replace(/[^0-9+]/g, '')}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 active:scale-[0.98]"
        >
          <Phone className="size-3.5 shrink-0" />
          <span>{c.label}</span>
          <span className="tabular-nums">{c.number}</span>
        </a>
      ))}
    </div>
  );
}

/** "The law that protects you" — the hero of an immediate-help card. Each curated
 *  rights provision: the section, a plain-language meaning, and a link to open/show
 *  the actual law. This — not a phone number — is the shield in the moment. */
function RightsShield({ sources, t, bn }: { sources: Source[]; t: (k: TranslationKey) => string; bn: boolean }) {
  if (!sources.length) return null;
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/[0.07] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gold">
        <Scale className="size-3.5 shrink-0" /> {t('ai.immediate.law')}
      </p>
      <ul className="space-y-2.5">
        {sources.map((s, i) => (
          <li key={s.unitId ?? i} className={cn('text-sm leading-relaxed', bn && 'font-bn')}>
            <span className="font-semibold text-foreground">{s.section || s.citation}</span>
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1.5 whitespace-nowrap text-xs font-medium text-gold underline underline-offset-2 hover:text-gold/80"
              >
                {t('ai.immediate.show')} ↗
              </a>
            )}
            {s.text && <span className="block text-foreground/80">{s.text}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantBubble({ msg, t }: { msg: AssistantMsg; t: (k: TranslationKey) => string }) {
  const showTrail = msg.process.length > 0;
  const hasAnswer = msg.text.trim().length > 0;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gold/12 text-gold ring-1 ring-inset ring-gold/20">
        <Sparkles className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        {msg.error ? (
          <div className="rounded-2xl rounded-tl-md border border-destructive/40 bg-card px-4 py-3 text-sm text-foreground shadow-soft">
            <span className="flex items-center gap-2 text-destructive"><AlertTriangle className="size-4" /> {msg.error}</span>
          </div>
        ) : (
          <>
            {/* Live agent trail — analyze → search → read → write */}
            {showTrail && <ProcessTrail msg={msg} t={t} />}

            {/* Retrieved law, as numbered source chips (the focused rights block
                replaces this generic panel in immediate-help mode).
                Only shown when the reply actually cites at least one source — prevents
                generic RAG results from appearing on greeting / off-topic turns where
                Gemini correctly responds without citing anything. */}
            {msg.sources.length > 0 && !msg.immediate && /\[\d+\]/.test(msg.text) && <SourcesPanel sources={msg.sources} t={t} />}

            {/* Answer prose (streams in word-by-word) */}
            {msg.pending && !hasAnswer ? (
              !showTrail && (
                <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft">
                  <TypingDots /> <span>{t('ai.thinking')}</span>
                </div>
              )
            ) : hasAnswer && msg.immediate ? (
              /* Immediate-help card — active danger: rights + contacts + do-now actions */
              <div className="overflow-hidden rounded-2xl rounded-tl-md border-2 border-destructive/40 bg-destructive/[0.04] shadow-soft">
                <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5">
                  <ShieldAlert className="size-4 shrink-0 text-destructive" />
                  <span className="text-xs font-bold uppercase tracking-wide text-destructive">{t('ai.immediate.title')}</span>
                </div>
                <div className="space-y-3 px-4 pb-3.5 pt-3">
                  {/* THE LAW first — the actual shield you can read out / show on screen */}
                  <RightsShield sources={msg.sources.filter((s) => s.sourceType === 'rights_pack')} t={t} bn={msg.bn} />
                  <Markdown text={msg.text} streaming={msg.streaming} sources={msg.sources} className={cn(msg.bn && 'font-bn')} />
                  {msg.steps.length > 0 && (
                    <div className="rounded-xl border border-destructive/25 bg-background/60 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                        <Siren className="size-3.5" /> {t('ai.immediate.steps')}
                      </p>
                      <ul className={cn('space-y-1.5 text-sm text-foreground/90', msg.bn && 'font-bn')}>
                        {msg.steps.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
                            <span><MarkdownInline text={s} sources={msg.sources} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Helplines demoted below the law — useful for the family / aftermath,
                      but the law is the shield in the moment, not a phone call. */}
                  {msg.emergencyContacts.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('ai.immediate.contacts')}</p>
                      <EmergencyContacts contacts={msg.emergencyContacts} />
                    </div>
                  )}
                </div>
              </div>
            ) : hasAnswer ? (
              <div className="space-y-3 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5 shadow-soft">
                <Markdown text={msg.text} streaming={msg.streaming} sources={msg.sources} className={cn(msg.bn && 'font-bn')} />
                {msg.steps.length > 0 && (
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">{t('ai.steps.title')}</p>
                    <ul className={cn('space-y-1.5 text-sm text-foreground/90', msg.bn && 'font-bn')}>
                      {msg.steps.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-gold" />
                          <span><MarkdownInline text={s} sources={msg.sources} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function phaseIcon(phase: string) {
  switch (phase) {
    case 'analyze':
    case 'classified':
    case 'thinking':
      return Brain;
    case 'search':
      return Search;
    case 'writing':
      return BookOpen;
    default:
      return Sparkles;
  }
}

/**
 * The Perplexity-style "thinking" trail: each agent step appears in order with a
 * spinner on the active step and a check once complete. Collapses to a one-line
 * summary once the answer is ready.
 */
function ProcessTrail({ msg, t }: { msg: AssistantMsg; t: (k: TranslationKey) => string }) {
  const active = msg.streaming;
  // Default: expanded while working, folded once done — but a user toggle wins.
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null);
  const open = userOpen ?? active;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-soft">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        {active
          ? <Loader2 className="size-4 shrink-0 animate-spin text-gold" />
          : <CheckCircle2 className="size-4 shrink-0 text-success" />}
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {active ? t('ai.process.title') : t('ai.process.done')}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-0.5 px-3.5 pb-3">
              {msg.process.map((p, i) => {
                const Icon = phaseIcon(p.phase);
                const isActive = !p.done && active;
                return (
                  <motion.li
                    key={`${p.phase}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2.5 py-1"
                  >
                    <span className={cn('grid size-5 shrink-0 place-items-center',
                      isActive ? 'text-gold' : p.done ? 'text-success' : 'text-muted-foreground')}>
                      {isActive
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : p.done
                          ? <CheckCircle2 className="size-3.5" />
                          : <Icon className="size-3.5" />}
                    </span>
                    <span className={cn('text-sm', isActive ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {p.label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Horizontal strip of numbered source cards — the law backing the answer. */
function SourcesPanel({ sources, t }: { sources: Source[]; t: (k: TranslationKey) => string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 px-3.5 py-3 shadow-soft">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BookOpen className="size-3.5 text-gold" />
        {t('ai.sources.title')}
        <span className="rounded-full bg-gold/12 px-1.5 py-0.5 text-[10px] font-bold leading-none text-gold">{sources.length}</span>
      </div>
      <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
        <AnimatePresence initial={false}>
          {sources.map((s, i) => (
            <SourceChip key={s.unitId ?? `${s.citation}-${i}`} index={i + 1} source={s} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SourceChip({ index, source }: { index: number; source: Source }) {
  const reduce = useReducedMotion();
  const label = source.section || source.citation;
  const cls = 'block w-52 shrink-0 rounded-xl border border-border bg-background/70 px-3 py-2 text-left transition-colors hover:border-gold/50 hover:bg-background';
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-gold/15 text-[10px] font-bold leading-none text-gold">{index}</span>
        <span className="truncate text-xs font-semibold text-foreground">{label}</span>
        {source.url && <ExternalLink className="ml-auto size-3 shrink-0 text-muted-foreground" />}
      </div>
      {source.text && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{source.text}</p>}
    </>
  );
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {source.url
        ? <a href={source.url} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        : <div className={cls}>{inner}</div>}
    </motion.div>
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
