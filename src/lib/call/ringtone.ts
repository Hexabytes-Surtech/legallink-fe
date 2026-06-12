// Incoming/outgoing call ring. Prefers a real audio file at /ringtone.mp3; if that
// file is missing or can't play, it falls back to a synthesised two-tone telephone
// ring (Web Audio) so the app ALWAYS rings. Also vibrates on supporting devices
// (Android). Background ringing for a CLOSED app is handled by Web Push (the OS
// plays the notification sound there).

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

// Drop a short loopable ringtone here: legallink-fe/public/ringtone.mp3
const RINGTONE_URL = '/ringtone.mp3';

let ctx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let vibrateTimer: ReturnType<typeof setInterval> | null = null;

let fileEl: HTMLAudioElement | null = null;
let fileBroken = false; // set true once /ringtone.mp3 fails to load → use the synth
let primed = false;

/** Respect a user-set "call sounds" preference (Settings toggle); default on. */
function soundEnabled(): boolean {
  try {
    return localStorage.getItem('ll_call_sound') !== 'off';
  } catch {
    return true;
  }
}

// ── Real audio file (preferred) ──────────────────────────────────────────────
function getFileEl(): HTMLAudioElement | null {
  if (fileBroken || typeof Audio === 'undefined') return null;
  if (!fileEl) {
    try {
      fileEl = new Audio(RINGTONE_URL);
      fileEl.loop = true;
      fileEl.preload = 'auto';
      fileEl.addEventListener('error', () => {
        fileBroken = true; // missing / unsupported → fall back to the synth
      });
    } catch {
      fileBroken = true;
      return null;
    }
  }
  return fileEl;
}

// ── Synthesised fallback (classic telephone ring) ────────────────────────────
function ensureCtx(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function synthRingOnce(peak: number): void {
  const c = ctx;
  if (!c) return;
  const t0 = c.currentTime;
  const dur = 1.0;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.05);
  gain.gain.setValueAtTime(peak, t0 + dur - 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  gain.connect(c.destination);
  for (const freq of [440, 480]) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {
        /* ignore */
      }
    };
  }
}

function startSynth(kind: 'incoming' | 'outgoing'): void {
  if (!ensureCtx()) return;
  if (ctx && ctx.state === 'suspended') void ctx.resume();
  const peak = kind === 'incoming' ? 0.16 : 0.07;
  synthRingOnce(peak);
  ringTimer = setInterval(() => synthRingOnce(peak), 3000);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Unlock audio on the first user gesture (browsers block audio until then). Resumes
 * the AudioContext and primes the <audio> element once so the ring can play when a
 * call arrives.
 */
export function unlockAudio(): void {
  try {
    const c = ensureCtx();
    if (c && c.state === 'suspended') void c.resume();
  } catch {
    /* ignore */
  }
  if (primed) return;
  primed = true;
  const el = getFileEl();
  if (el) {
    el.muted = true;
    el.play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        el.muted = false;
      });
  }
}

/** Start ringing. `incoming` = loud + vibrate; `outgoing` = soft ringback. */
export function startRinging(kind: 'incoming' | 'outgoing'): void {
  stopRinging();

  if (soundEnabled()) {
    const el = getFileEl();
    if (el) {
      el.volume = kind === 'incoming' ? 1 : 0.4;
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      el.play().catch(() => {
        // Couldn't play the file (not yet unlocked / decode issue) — use the synth.
        startSynth(kind);
      });
    } else {
      startSynth(kind);
    }
  }

  if (kind === 'incoming' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const buzz = () => {
      try {
        navigator.vibrate([350, 250, 350]);
      } catch {
        /* ignore */
      }
    };
    buzz();
    vibrateTimer = setInterval(buzz, 2000);
  }
}

/** Stop any ring + vibration. Idempotent. */
export function stopRinging(): void {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  if (vibrateTimer) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  if (fileEl) {
    try {
      fileEl.pause();
      fileEl.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
}
