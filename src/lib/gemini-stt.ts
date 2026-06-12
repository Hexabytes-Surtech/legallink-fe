// Browser-side Gemini speech-to-text.
//
// The frontend calls the Gemini REST API DIRECTLY with its own key
// (NEXT_PUBLIC_GEMINI_API_KEY) so the NestJS backend stays untouched and
// unburdened. Audio is recorded locally, converted to 16 kHz mono WAV (a
// Gemini-supported format) and sent in ONE request — no live streaming, so
// nothing is lost to network lag or silence-driven restarts (the failure mode
// of the browser Web Speech API). Only needs to reach the Gemini API endpoint,
// not Google's separate speech service.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Current, multimodal (accepts audio), and the most generous free-tier limits
// (30 RPM / 1,000 RPD / 1M TPM). gemini-2.0-flash is being shut down — avoid it.
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export type SttLang = 'en' | 'bn';

export type SttErrorKind =
  | 'no-key' // NEXT_PUBLIC_GEMINI_API_KEY not set
  | 'network' // request never reached Gemini (offline / blocked / CORS)
  | 'rejected' // Gemini answered with an error (bad key, quota, 4xx/5xx)
  | 'empty' // transcription came back blank
  | 'unknown';

export interface SttError extends Error {
  kind: SttErrorKind;
}

function sttError(kind: SttErrorKind, message: string): SttError {
  const e = new Error(message) as SttError;
  e.kind = kind;
  return e;
}

export function getSttConfig(): { apiKey: string | undefined; model: string } {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() || undefined;
  const model = process.env.NEXT_PUBLIC_GEMINI_STT_MODEL?.trim() || DEFAULT_MODEL;
  return { apiKey, model };
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

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

function cleanTranscript(raw: string): string {
  let s = raw.trim();
  // The model is told to output bare text, but strip a stray wrapping quote or
  // a "Transcription:" label just in case it adds one.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('“') && s.endsWith('”'))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^(?:transcription|transcript)\s*:\s*/i, '');
  return s;
}

/**
 * Transcribe a recorded audio blob via Gemini and return the plain text.
 * Throws an {@link SttError} (with a `kind`) on any failure.
 */
export async function transcribeAudio(blob: Blob, lang: SttLang): Promise<string> {
  const { apiKey, model } = getSttConfig();
  if (!apiKey) throw sttError('no-key', 'NEXT_PUBLIC_GEMINI_API_KEY is not set');

  const wav = await blobToWav(blob);
  const base64 = await blobToBase64(wav);

  const langName = lang === 'bn' ? 'Bengali (output in Bengali/Bangla script)' : 'English';
  const prompt =
    `You are a precise speech-to-text engine. Transcribe the spoken audio verbatim in ${langName}. ` +
    `Output ONLY the exact transcription text — no quotes, no preamble, no notes, no translation, no markdown. ` +
    `If the audio is silent or unintelligible, output nothing at all.`;

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }, { inline_data: { mime_type: 'audio/wav', data: base64 } }] },
          ],
          generationConfig: { temperature: 0, maxOutputTokens: 2048 },
        }),
      },
    );
  } catch (err) {
    throw sttError('network', `Gemini request failed to send: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw sttError('rejected', `Gemini HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    throw sttError('unknown', 'Gemini returned a non-JSON response');
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  return cleanTranscript(text);
}
