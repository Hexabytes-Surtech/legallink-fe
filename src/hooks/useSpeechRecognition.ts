'use client';

import * as React from 'react';

// Browser-native speech-to-text (Web Speech API). No backend, no API key — the
// recognition runs through the browser's own service (Chrome/Edge desktop +
// Android Chrome). Firefox has no support and iOS Safari is unreliable, so the
// hook reports `supported: false` there and the caller hides the mic button.

export type SpeechErrorKind =
  | 'not-allowed' // mic permission blocked
  | 'no-speech' // heard nothing (benign)
  | 'audio' // no/blocked microphone hardware
  | 'network' // recognition service unreachable (offline, firewall, or Brave)
  | 'aborted' // stopped programmatically (benign)
  | 'insecure' // page not served over HTTPS/localhost — the API refuses to run
  | 'unknown';

// ── Minimal typings (the Web Speech API isn't in the default DOM lib) ─────────
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechErrorEvent {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function mapError(code: string): SpeechErrorKind {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag passed to the recogniser, e.g. 'en-IN' or 'bn-IN'. */
  lang?: string;
  /**
   * Fired on every (interim + final) update with the full transcript spoken
   * since `start()` was last called. The caller decides how to merge it into
   * its own text state.
   */
  onResult?: (fullTranscript: string) => void;
  onError?: (kind: SpeechErrorKind) => void;
  onEnd?: () => void;
}

export interface UseSpeechRecognition {
  /** True only on browsers that expose the Web Speech API. */
  supported: boolean;
  /** True while the microphone is actively transcribing. */
  listening: boolean;
  /** Begin a fresh dictation session (resets the accumulated transcript). */
  start: () => void;
  /** End the current session. Idempotent. */
  stop: () => void;
}

/**
 * Thin React wrapper over the Web Speech API for live voice-to-text. Accumulates
 * final results across the browser's automatic silence-driven restarts so a long
 * dictation isn't lost, and surfaces interim words for a live preview.
 */
export function useSpeechRecognition(
  opts: UseSpeechRecognitionOptions = {},
): UseSpeechRecognition {
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);

  const recRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = React.useRef(''); // finalized text, kept across auto-restarts
  const keepAliveRef = React.useRef(false); // user wants to keep listening

  // Latest options reachable from the recogniser's event handlers without
  // re-subscribing them every render. Speech events always fire after commit,
  // so updating this in an effect is safe.
  const optsRef = React.useRef(opts);
  React.useEffect(() => {
    optsRef.current = opts;
  });

  // Capability check runs after mount so SSR markup (no button) matches the
  // first client render, then reveals the button on capable browsers.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot browser capability read
    setSupported(getCtor() !== null);
  }, []);

  const stop = React.useCallback(() => {
    keepAliveRef.current = false;
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setListening(false);
  }, []);

  const start = React.useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;

    // The Web Speech API only runs in a secure context. The most common failure
    // is testing on a phone against a dev server over http://<lan-ip> — it never
    // starts and looks like a generic failure. Report it clearly instead.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      optsRef.current.onError?.('insecure');
      return;
    }

    // Tear down any prior instance so handlers don't double-fire.
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    finalRef.current = '';
    keepAliveRef.current = true;

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = optsRef.current.lang ?? 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalRef.current += text;
        else interim += text;
      }
      const full = (finalRef.current + interim).replace(/\s+/g, ' ').trimStart();
      optsRef.current.onResult?.(full);
    };

    rec.onerror = (e) => {
      const kind = mapError(e.error);
      // Surface the raw code so a "fails every time" report is diagnosable.
      console.warn('[voice] recognition error:', e.error, '→', kind);
      // Hard failures: don't auto-restart on the silent end that follows.
      if (kind === 'not-allowed' || kind === 'audio' || kind === 'network') {
        keepAliveRef.current = false;
      }
      optsRef.current.onError?.(kind);
    };

    rec.onend = () => {
      // The browser ends a session after a pause; if the user hasn't stopped,
      // seamlessly restart so dictation feels continuous.
      if (keepAliveRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to a clean stop */
        }
      }
      setListening(false);
      optsRef.current.onEnd?.();
    };

    try {
      rec.start();
    } catch {
      /* a start() race — the existing session keeps going */
    }
  }, []);

  // Abort cleanly if the component unmounts mid-dictation.
  React.useEffect(
    () => () => {
      keepAliveRef.current = false;
      const rec = recRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  return { supported, listening, start, stop };
}
