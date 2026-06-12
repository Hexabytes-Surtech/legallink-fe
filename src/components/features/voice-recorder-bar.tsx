'use client';

import * as React from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { VoiceStatus } from '@/hooks/useVoiceTranscription';

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type AudioCtor = typeof AudioContext;

/**
 * Live mic-level waveform — symmetric bars driven by an AnalyserNode and
 * animated via requestAnimationFrame with direct style writes (no React
 * re-render per frame). This is the recognisable "I'm listening" visual that
 * ChatGPT / Claude show while dictating, so the recording state is unambiguous.
 */
function Waveform({ stream, bars = 28 }: { stream: MediaStream | null; bars?: number }) {
  const refs = React.useRef<(HTMLSpanElement | null)[]>([]);

  React.useEffect(() => {
    if (!stream) return;
    const AC: AudioCtor | undefined =
      (typeof window !== 'undefined' && window.AudioContext) ||
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    const n = refs.current.length;
    const mid = (n - 1) / 2;
    const draw = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < n; i++) {
        const el = refs.current[i];
        if (!el) continue;
        // Centre bars map to the loud low frequencies → a symmetric "mountain".
        const dist = mid === 0 ? 0 : Math.abs(i - mid) / mid;
        const bin = 1 + Math.floor(dist * (data.length - 2));
        const v = data[bin] / 255;
        el.style.transform = `scaleY(${(0.16 + v * 0.84).toFixed(3)})`;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close().catch(() => {});
    };
  }, [stream]);

  return (
    <div className="flex h-6 flex-1 items-center justify-center gap-[3px] overflow-hidden">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="h-full w-[3px] origin-center rounded-full bg-gold transition-transform duration-75"
          style={{ transform: 'scaleY(0.16)' }}
        />
      ))}
    </div>
  );
}

/**
 * In-composer recording UI (replaces the textarea row while dictating). Shows a
 * pulsing record dot, the live waveform, an elapsed timer, and Cancel (discard)
 * / Done (stop + transcribe) controls — then a "transcribing…" state.
 */
export function VoiceRecorderBar({
  status,
  seconds,
  stream,
  onCancel,
  onStop,
  className,
}: {
  status: VoiceStatus;
  seconds: number;
  stream: MediaStream | null;
  onCancel: () => void;
  onStop: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const transcribing = status === 'transcribing';

  return (
    <div
      className={cn(
        'flex h-11 w-full items-center gap-2 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCancel}
        aria-label={t('ai.voice.cancel')}
        title={t('ai.voice.cancel')}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <X className="size-4" />
      </button>

      {transcribing ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="animate-pulse">{t('ai.voice.transcribing')}</span>
        </div>
      ) : (
        <>
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
          </span>
          <Waveform stream={stream} />
          <span className="shrink-0 tabular-nums text-xs font-medium text-muted-foreground">
            {fmt(seconds)}
          </span>
        </>
      )}

      <button
        type="button"
        onClick={onStop}
        disabled={transcribing}
        aria-label={t('ai.voice.done')}
        title={t('ai.voice.done')}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50"
      >
        <Check className="size-4" />
      </button>
    </div>
  );
}
