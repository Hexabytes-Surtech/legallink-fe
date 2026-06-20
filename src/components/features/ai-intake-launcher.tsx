'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Sparkles, Mic, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { Waveform } from './voice-recorder-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function isBnText(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SS_SEED = 'll_ai_seed';

const PROMPTS_EN = [
  "My landlord won't return my security deposit…",
  'I was wrongfully terminated from my job…',
  'A shop sold me a defective product and refuses a refund…',
  'My neighbour is encroaching on my property…',
  'I need help with a divorce and child custody…',
];
const PROMPTS_BN = [
  'আমার বাড়িওয়ালা জামানতের টাকা ফেরত দিচ্ছে না…',
  'আমাকে অন্যায়ভাবে চাকরি থেকে বরখাস্ত করা হয়েছে…',
  'একটি দোকান ত্রুটিপূর্ণ পণ্য বিক্রি করে রিফান্ড দিচ্ছে না…',
  'আমার প্রতিবেশী আমার জমি দখল করছে…',
  'আমার বিবাহবিচ্ছেদ ও সন্তানের অভিভাবকত্বে সাহায্য দরকার…',
];

export function AiIntakeLauncher({ className, autoFocus, onEngaged }: { className?: string; autoFocus?: boolean; onEngaged?: () => void }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const isBn = language === 'bn';
  const typedBn = isBnText(query) || isBn;
  const ref = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const {
    supported: micSupported,
    status: voiceStatus,
    seconds: voiceSeconds,
    stream: voiceStream,
    start: startDictation,
    stop: stopDictation,
    cancel: cancelDictation,
  } = useVoiceTranscription({
    lang: typedBn ? 'bn' : 'en',
    onResult: (text) => {
      setQuery((prev) => prev + (prev && !/\s$/.test(prev) ? ' ' : '') + text);
      onEngaged?.();
    },
    onError: (kind) => {
      toast.error(
        kind === 'not-allowed' ? t('ai.voice.denied')
          : kind === 'insecure' ? t('ai.voice.insecure')
            : kind === 'no-mic' ? t('ai.voice.nomic')
              : kind === 'no-key' ? t('ai.voice.nokey')
                : kind === 'network' ? t('ai.voice.network')
                  : kind === 'rejected' ? t('ai.voice.rejected')
                    : kind === 'empty' ? t('ai.voice.empty')
                      : t('ai.voice.error'),
      );
    },
  });

  const voiceActive = voiceStatus !== 'idle';
  const voiceTranscribing = voiceStatus === 'transcribing';

  // Auto-resize textarea as content grows
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [query]);

  // Typewriter placeholder
  const showTypewriter = !focused && query === '' && !voiceActive;
  React.useEffect(() => {
    if (!showTypewriter) return;
    const prompts = isBn ? PROMPTS_BN : PROMPTS_EN;
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = prompts[phrase];
      char += deleting ? -1 : 1;
      setTyped(full.slice(0, char));
      if (!deleting && char === full.length) {
        deleting = true;
        timer = setTimeout(tick, 2000);
      } else if (deleting && char === 0) {
        deleting = false;
        phrase = (phrase + 1) % prompts.length;
        timer = setTimeout(tick, 450);
      } else {
        timer = setTimeout(tick, deleting ? 28 : 52);
      }
    };
    timer = setTimeout(tick, 350);
    return () => clearTimeout(timer);
  }, [showTypewriter, isBn]);

  function start(e?: React.FormEvent) {
    e?.preventDefault();
    cancelDictation();
    const trimmed = query.trim();
    if (!trimmed) return;
    try { sessionStorage.setItem(SS_SEED, trimmed); } catch { /* ignore */ }
    router.push('/assistant');
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn('group relative', className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[3px] rounded-[26px] opacity-50 blur-lg transition-all duration-500 animate-border-rotate group-hover:opacity-80 group-focus-within:-inset-[7px] group-focus-within:opacity-100 group-focus-within:blur-xl group-focus-within:[animation-duration:2.5s]"
        style={{
          background:
            'conic-gradient(from var(--ll-angle), var(--gold), var(--gold-bright), var(--info), var(--gold-bright), var(--gold))',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[22px] opacity-60 transition-all duration-500 animate-border-rotate group-focus-within:-inset-[2px] group-focus-within:opacity-100 group-focus-within:[animation-duration:2.5s]"
        style={{
          background:
            'conic-gradient(from var(--ll-angle), var(--gold), var(--gold-bright), var(--info), var(--gold))',
        }}
      />

      <form
        onSubmit={start}
        className={cn(
          'relative rounded-[21px] bg-card p-3 shadow-lift transition-all duration-300',
          'group-hover:-translate-y-0.5 group-focus-within:-translate-y-1.5 group-focus-within:scale-[1.01]',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[21px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--gold) 14%, transparent), transparent 60%)',
          }}
        />

        <div className="relative">
          {voiceActive ? (
            /* ── Full-card voice orb ──────────────────────────────────────── */
            <div className="flex flex-col items-center gap-5 py-4 animate-in fade-in-0 zoom-in-95 duration-300">
              {/* Pulsing orb */}
              <div className="relative flex h-36 w-36 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-info/20 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                <span
                  aria-hidden
                  className="absolute inset-3 rounded-full bg-info/15 animate-ping"
                  style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
                />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-info/30 to-primary/20 ring-2 ring-info/40 shadow-[0_0_40px_color-mix(in_srgb,var(--info)_40%,transparent)]">
                  {voiceTranscribing ? (
                    <Loader2 className="size-8 animate-spin text-info" />
                  ) : (
                    <Waveform stream={voiceStream} bars={16} />
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                {voiceTranscribing ? (
                  <p className="text-sm text-muted-foreground animate-pulse">{t('ai.voice.transcribing')}</p>
                ) : (
                  <>
                    <p className="text-2xl font-mono tabular-nums font-medium">{fmt(voiceSeconds)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground animate-pulse">Listening…</p>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={cancelDictation}
                  aria-label={t('ai.voice.cancel')}
                  className="grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive transition-colors hover:bg-destructive/25 active:scale-95"
                >
                  <X className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={stopDictation}
                  disabled={voiceTranscribing}
                  aria-label={t('ai.voice.done')}
                  className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  <Check className="size-6" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Normal compose mode ──────────────────────────────────────── */
            <>
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
                <Lock className="size-3" /> {t('landing.chat.pill')}
              </div>
              <div className="flex items-end gap-2">
                <div className="relative min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    autoFocus={autoFocus}
                    value={query}
                    onFocus={() => { setFocused(true); onEngaged?.(); }}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => { setQuery(e.target.value); onEngaged?.(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); } }}
                    rows={1}
                    className={cn(
                      'min-h-[5rem] max-h-40 w-full resize-none bg-transparent px-2 py-2 text-base leading-relaxed outline-none sm:text-lg',
                      typedBn && 'font-bn',
                    )}
                  />
                  {showTypewriter && (
                    <div
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute inset-0 px-2 py-2 text-base leading-relaxed text-muted-foreground sm:text-lg',
                        isBn && 'font-bn',
                      )}
                    >
                      {typed}
                      <span className="ml-px inline-block w-px animate-caret bg-gold align-middle" style={{ height: '1.1em' }} />
                    </div>
                  )}
                </div>
                {micSupported && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={startDictation}
                    aria-label={t('ai.voice.start')}
                    title={t('ai.voice.start')}
                    className="h-12 w-12 shrink-0 text-muted-foreground transition-transform active:scale-95"
                  >
                    <Mic className="size-5" />
                  </Button>
                )}
                <Button type="submit" disabled={!query.trim()} size="lg" className="shrink-0 glow-gold transition-transform active:scale-95">
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">{t('landing.cta.primary')}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="mt-1.5 px-2 text-[11px] text-muted-foreground">{t('landing.chat.hint')}</div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
