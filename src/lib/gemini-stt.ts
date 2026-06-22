// Browser-side speech-to-text — proxied through the LegalLink backend.
//
// Audio is recorded locally, converted to 16 kHz mono WAV, and POSTed to
// POST /api/ai/transcribe (our NestJS backend). The backend holds the Gemini
// API key and handles the model-fallback chain (2.5-flash-lite → gemini-3).
// No NEXT_PUBLIC_GEMINI_API_KEY is needed or used in the browser.

import { api } from '@/lib/api/client';

export type SttLang = 'en' | 'bn';

export type SttErrorKind =
  | 'network'  // request never reached the backend (offline / CORS)
  | 'rejected' // backend returned an error (Gemini unavailable, quota, etc.)
  | 'empty'    // transcription came back blank
  | 'unknown';

export interface SttError extends Error {
  kind: SttErrorKind;
}

function sttError(kind: SttErrorKind, message: string): SttError {
  const e = new Error(message) as SttError;
  e.kind = kind;
  return e;
}

/** A MediaRecorder mime the current browser actually supports, or undefined. */
export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* isTypeSupported can throw on odd inputs — ignore */
    }
  }
  return undefined;
}

type AudioCtor = typeof AudioContext;
type OfflineCtor = typeof OfflineAudioContext;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ??
    null
  );
}
function offlineCtor(): OfflineCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: OfflineCtor }).webkitOfflineAudioContext ??
    null
  );
}

// Decode whatever the recorder produced, resample to 16 kHz mono, and return it
// as a 16-bit PCM WAV blob — the smallest, most universally accepted form for
// Gemini (and a tiny upload, which matters on slow links).
async function blobToWav(blob: Blob): Promise<Blob> {
  const AC = audioCtor();
  const OAC = offlineCtor();
  if (!AC || !OAC) throw sttError('unknown', 'Web Audio API unavailable');

  const arrayBuf = await blob.arrayBuffer();
  const decodeCtx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf);
  } finally {
    void decodeCtx.close().catch(() => {});
  }

  const targetRate = 16000;
  const frames = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OAC(1, frames, targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return new Blob([encodeWav(rendered.getChannelData(0), targetRate)], { type: 'audio/wav' });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (mono, 16-bit)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buffer;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe a recorded audio blob by sending it to the LegalLink backend,
 * which proxies the request to Gemini (2.5-flash-lite, with gemini-3 fallback).
 * Throws an {@link SttError} (with a `kind`) on any failure.
 */
export async function transcribeAudio(blob: Blob, lang: SttLang): Promise<string> {
  const wav = await blobToWav(blob);
  const audio = await blobToBase64(wav);

  let result: { text: string };
  try {
    result = await api.post<{ text: string }>('/ai/transcribe', { audio, lang });
  } catch (err) {
    const msg = (err as Error).message ?? '';
    // ApiError (4xx/5xx from our BE) or network failure
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
      throw sttError('network', `Transcription request failed: ${msg}`);
    }
    throw sttError('rejected', `Transcription error: ${msg}`);
  }

  const text = (result?.text ?? '').trim();
  if (!text) throw sttError('empty', 'No speech detected');
  return text;
}
