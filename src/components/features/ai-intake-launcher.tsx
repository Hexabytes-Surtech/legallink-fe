'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Sparkles, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { VoiceRecorderBar } from './voice-recorder-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Even one Bengali codepoint flips the typing font.
function isBnText(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

const SS_SEED = 'll_ai_seed';

// Rotating example questions the typewriter cycles through as a living placeholder.
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

/**
 * Landing-page composer that opens the conversational assistant. Unlike the old
 * one-shot intake, it doesn't create a matter — it stashes the first message and
 * routes into the multi-turn chat (/assistant), which auto-sends it. Anonymous
 * friendly: no account needed to start talking.
 */
export function AiIntakeLauncher({ className, autoFocus, onEngaged }: { className?: string; autoFocus?: boolean; onEngaged?: () => void }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const isBn = language === 'bn';
  const typedBn = isBnText(query) || isBn;
  const ref = React.useRef<HTMLDivElement>(null);

  // ── voice typing (record → Gemini transcription) ─────────────────────────
  // Records the whole clip locally, then sends it once to Gemini (FE key) — no
  // live streaming, so nothing is lost to network lag. The recogniser language
  // follows the app's EN/বাংলা toggle, so Bengali speech comes back in Bengali.
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
      // Append the transcribed words onto whatever was already typed.
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

  // Typewriter placeholder: types out each example, pauses, deletes, next.
  // Pauses entirely while the user is engaged (focused or has typed something).
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
        timer = setTimeout(tick, 2000); // hold the finished phrase
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
    cancelDictation(); // discard any in-progress recording
    const trimmed = query.trim();
    if (!trimmed) return;
    try { sessionStorage.setItem(SS_SEED, trimmed); } catch { /* ignore */ }
    router.push('/assistant');
  }

  // Pointer-follow inner glow — lets the composer feel alive/interactive.
  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }

  return (
    // Outer group provides depth: a rotating gradient halo behind a lifted card.
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn('group relative', className)}
    >
      {/* Rotating glow halo — the eye-catcher. On focus it grows thicker,
          brighter, and spins noticeably faster ("wakes up"). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[3px] rounded-[26px] opacity-50 blur-lg transition-all duration-500 animate-border-rotate group-hover:opacity-80 group-focus-within:-inset-[7px] group-focus-within:opacity-100 group-focus-within:blur-xl group-focus-within:[animation-duration:2.5s]"
        style={{
          background:
            'conic-gradient(from var(--ll-angle), var(--gold), var(--gold-bright), var(--info), var(--gold-bright), var(--gold))',
        }}
      />
      {/* Crisp gradient ring hugging the card edge */}
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
        {/* Pointer-follow inner radial highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[21px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, var(--gold) 14%, transparent), transparent 60%)',
          }}
        />

        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold">
            <Lock className="size-3" /> {t('landing.chat.pill')}
          </div>
          <div className="flex items-end gap-2">
            {voiceActive ? (
              <VoiceRecorderBar
                status={voiceStatus}
                seconds={voiceSeconds}
                stream={voiceStream}
                onCancel={cancelDictation}
                onStop={stopDictation}
                className="h-12"
              />
            ) : (
              <>
                <div className="relative flex-1">
                  <textarea
                    autoFocus={autoFocus}
                    value={query}
                    onFocus={() => { setFocused(true); onEngaged?.(); }}
                    onBlur={() => setFocused(false)}
                    onChange={(e) => { setQuery(e.target.value); onEngaged?.(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); } }}
                    rows={3}
                    className={cn(
                      'max-h-40 min-h-11 w-full resize-none bg-transparent px-2 py-2 text-base leading-relaxed outline-none sm:text-lg',
                      typedBn && 'font-bn',
                    )}
                  />
                  {/* Living placeholder — typewriter cycling example questions. */}
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
                  <Sparkles className="size-4" />{t('landing.cta.primary')}<ArrowRight className="size-4" />
                </Button>
              </>
            )}
          </div>
          <div className="mt-1.5 px-2 text-[11px] text-muted-foreground">{t('landing.chat.hint')}</div>
        </div>
      </form>
    </div>
  );
}
