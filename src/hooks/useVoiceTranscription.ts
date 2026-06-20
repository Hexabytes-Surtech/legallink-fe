'use client';

import * as React from 'react';
import {
  transcribeAudio,
  pickRecorderMime,
  getSttConfig,
  type SttLang,
  type SttError,
} from '@/lib/gemini-stt';

// Record-then-transcribe voice typing. Unlike the live Web Speech API (which
// streams every word to Google and drops words on a slow link), this captures
// the WHOLE clip locally, then sends it once to Gemini. Reliable on poor
// connections; the trade-off is it's tap-to-record, not live.

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

export type VoiceErrorKind =
  | 'not-allowed' // mic permission denied
  | 'no-mic' // no microphone / capture failed
  | 'insecure' // page not on https/localhost
  | 'no-key' // NEXT_PUBLIC_GEMINI_API_KEY missing
  | 'network' // couldn't reach Gemini
  | 'rejected' // Gemini errored (bad key, quota…)
  | 'empty' // nothing intelligible captured
  | 'unknown';

const MAX_SECONDS = 90; // safety auto-stop so a forgotten mic can't balloon the upload

export interface UseVoiceTranscriptionOptions {
  lang?: SttLang;
  onResult?: (text: string) => void;
  onError?: (kind: VoiceErrorKind) => void;
}

export interface UseVoiceTranscription {
  /** True only when the browser can record AND a Gemini key is configured. */
  supported: boolean;
  status: VoiceStatus;
  /** Elapsed recording seconds (for the timer display). */
  seconds: number;
  /** Live mic stream while recording — feeds the waveform visualiser. */
  stream: MediaStream | null;
  /** Begin recording (asks for mic permission the first time). */
  start: () => void;
  /** Stop and transcribe what was captured. */
  stop: () => void;
  /** Discard the recording without transcribing. */
  cancel: () => void;
}

export function useVoiceTranscription(
  opts: UseVoiceTranscriptionOptions = {},
): UseVoiceTranscription {
  const [supported, setSupported] = React.useState(false);
  const [status, setStatus] = React.useState<VoiceStatus>('idle');
  const [seconds, setSeconds] = React.useState(0);
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  const optsRef = React.useRef(opts);
  React.useEffect(() => {
    optsRef.current = opts;
  });

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = React.useRef(false);
  const statusRef = React.useRef<VoiceStatus>('idle');
  const setPhase = React.useCallback((s: VoiceStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  // Capability check after mount — show the button on any browser that can
  // record audio. If the Gemini key is missing, start() surfaces a 'no-key'
  // error toast rather than hiding the button entirely.
  React.useEffect(() => {
    const capable =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined';
    if (capable && !getSttConfig().apiKey) {
      console.warn(
        '[voice] NEXT_PUBLIC_GEMINI_API_KEY not set — voice button visible but transcription will fail until key is added',
      );
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot capability read
    setSupported(capable);
  }, []);

  const teardown = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const finish = React.useCallback(async () => {
    teardown();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (cancelledRef.current) {
      setPhase('idle');
      return;
    }
    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    if (blob.size < 1200) {
      // basically nothing was captured
      setPhase('idle');
      optsRef.current.onError?.('empty');
      return;
    }
    setPhase('transcribing');
    try {
      const text = await transcribeAudio(blob, optsRef.current.lang ?? 'en');
      setPhase('idle');
      if (cancelledRef.current) return; // cancelled mid-transcription → drop the result
      if (text) optsRef.current.onResult?.(text);
      else optsRef.current.onError?.('empty');
    } catch (err) {
      console.warn('[voice] transcription failed:', err);
      setPhase('idle');
      if (!cancelledRef.current) optsRef.current.onError?.((err as SttError).kind ?? 'unknown');
    }
  }, [teardown, setPhase]);

  const stopRecorder = React.useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop(); // fires onstop → finish()
        return true;
      } catch {
        /* fall through */
      }
    }
    return false;
  }, []);

  const start = React.useCallback(async () => {
    if (statusRef.current !== 'idle') return;
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      optsRef.current.onError?.('insecure');
      return;
    }
    if (!getSttConfig().apiKey) {
      optsRef.current.onError?.('no-key');
      return;
    }

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as Error).name;
      optsRef.current.onError?.(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'not-allowed' : 'no-mic',
      );
      return;
    }

    streamRef.current = mediaStream;
    setStream(mediaStream);
    cancelledRef.current = false;
    chunksRef.current = [];

    const mime = pickRecorderMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
    } catch {
      rec = new MediaRecorder(mediaStream);
    }
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => void finish();
    rec.start();

    setSeconds(0);
    setPhase('recording');
    timerRef.current = setInterval(() => {
      setSeconds((n) => {
        const next = n + 1;
        if (next >= MAX_SECONDS) stopRecorder(); // safety auto-stop
        return next;
      });
    }, 1000);
  }, [finish, stopRecorder, setPhase]);

  const stop = React.useCallback(() => {
    if (!stopRecorder()) {
      teardown();
      setPhase('idle');
    }
  }, [stopRecorder, teardown, setPhase]);

  const cancel = React.useCallback(() => {
    cancelledRef.current = true;
    if (!stopRecorder()) {
      teardown();
      setPhase('idle');
    }
  }, [stopRecorder, teardown, setPhase]);

  // Abort cleanly if the component unmounts mid-capture.
  React.useEffect(
    () => () => {
      cancelledRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      teardown();
    },
    [teardown],
  );

  return { supported, status, seconds, stream, start, stop, cancel };
}
