'use client';

import * as React from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize,
  Minimize,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function formatDuration(total: number) {
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Binds a MediaStream to a <video> element (srcObject can't be set via props). */
function VideoTile({
  stream,
  muted,
  mirror,
  className,
}: {
  stream: MediaStream | null;
  muted: boolean;
  mirror?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn(mirror && 'scale-x-[-1]', className)}
    />
  );
}

/** Plays remote audio for a voice-only call (no visible video element). */
function AudioSink({ stream }: { stream: MediaStream | null }) {
  const ref = React.useRef<HTMLAudioElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

/** Browser Fullscreen API wired to a container element (Meet-style expand). */
function useFullscreen(ref: React.RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = React.useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      ref.current?.requestFullscreen().catch(() => {});
    }
  }, [ref]);

  return { isFullscreen, toggle };
}

/** Round control button (mic / camera / fullscreen). */
function ControlButton({
  onClick,
  active,
  label,
  icon,
  onDark,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  icon: React.ReactNode;
  /** True when the button sits on the dark video chrome (vs the themed card). */
  onDark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'flex size-12 items-center justify-center rounded-full transition active:scale-95 sm:size-14',
        onDark
          ? active
            ? 'bg-white text-neutral-900'
            : 'bg-white/15 text-white hover:bg-white/25'
          : active
            ? 'bg-foreground text-background'
            : 'bg-muted text-foreground hover:bg-muted/70',
      )}
    >
      {icon}
    </button>
  );
}

/** Red hang-up button; size is controlled by the caller via className. */
function EndCallButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="End call"
      title="End call"
      className={cn(
        'flex items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition hover:brightness-110 active:scale-95',
        className,
      )}
    >
      <PhoneOff className="size-6" />
    </button>
  );
}

/**
 * In-call UI. Renders as:
 *   - a compact docked bar when minimized (keep using the app during a call),
 *   - a centered themed card for voice calls,
 *   - a large Meet-style window for video calls (full-screen on mobile,
 *     contained popup on desktop, with a real Fullscreen toggle).
 */
export function CallOverlay() {
  const {
    phase,
    mode,
    peerName,
    peerAvatar,
    muted,
    cameraOff,
    localStream,
    remoteStream,
    hangUp,
    toggleMute,
    toggleCamera,
  } = useCall();

  const shellRef = React.useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(shellRef);

  const [minimized, setMinimized] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [prevPhase, setPrevPhase] = React.useState(phase);

  // Adjust derived UI state when the call phase changes. This is the render-phase
  // "previous value" pattern (not an effect), so there is no setState-in-effect:
  //   - the timer only counts during an active call (reset otherwise),
  //   - each new call starts expanded.
  if (prevPhase !== phase) {
    setPrevPhase(phase);
    if (phase !== 'active') setSeconds(0);
    if (phase === 'idle') setMinimized(false);
  }

  // Tick once per second while connected. The increment lives in the interval
  // callback (never in the effect body), so the timer keeps running across
  // minimize/expand and fullscreen toggles instead of resetting to 00:00.
  React.useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const visible = phase === 'outgoing' || phase === 'connecting' || phase === 'active';
  if (!visible) return null;

  const isVideo = mode === 'video';
  const statusText =
    phase === 'outgoing'
      ? `Calling ${peerName || 'user'}…`
      : phase === 'connecting'
        ? 'Connecting…'
        : null;
  // Long form (with name) for cards; short form for the compact video header.
  const subtitle = statusText ?? formatDuration(seconds);
  const headerStatus =
    phase === 'active' ? formatDuration(seconds) : phase === 'connecting' ? 'Connecting…' : 'Ringing…';

  // ── Minimized: compact docked bar ───────────────────────────────────────────
  if (minimized) {
    const showThumb = isVideo && phase === 'active' && !!remoteStream;
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:w-80">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-2xl backdrop-blur">
          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
            {showThumb ? (
              <VideoTile stream={remoteStream} muted={false} className="h-full w-full object-cover" />
            ) : (
              <Avatar className="size-11 rounded-xl">
                {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
                <AvatarFallback className="rounded-xl bg-gold/15 text-gold">
                  {initials(peerName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-card-foreground">{peerName || 'User'}</p>
            <p className="truncate text-xs tabular-nums text-muted-foreground">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
            aria-pressed={muted}
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-95',
              muted ? 'bg-foreground text-background' : 'bg-muted text-foreground hover:bg-muted/70',
            )}
          >
            {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label="Expand call"
            title="Expand call"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-muted/70 active:scale-95"
          >
            <Maximize2 className="size-4" />
          </button>
          <EndCallButton onClick={hangUp} className="size-9 shrink-0" />
        </div>

        {!isVideo && <AudioSink stream={remoteStream} />}
      </div>
    );
  }

  // ── Voice call: centered themed card ────────────────────────────────────────
  if (!isVideo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm sm:p-6">
        <div className="relative flex h-full w-full flex-col items-center justify-center bg-card px-6 text-center sm:h-auto sm:max-w-sm sm:rounded-3xl sm:border sm:border-border sm:px-8 sm:py-10 sm:shadow-2xl">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize call"
            title="Minimize call"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted active:scale-95"
          >
            <Minimize2 className="size-5" />
          </button>

          <div className="relative mx-auto mb-5 size-24">
            {phase !== 'active' && (
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/20" />
            )}
            <span className="absolute -inset-2 rounded-full border-2 border-gold/30" />
            <Avatar className="relative size-24 ring-2 ring-gold/50">
              {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
              <AvatarFallback className="bg-gold/15 text-3xl text-gold">
                {initials(peerName)}
              </AvatarFallback>
            </Avatar>
          </div>

          <p className="text-xl font-semibold text-card-foreground">{peerName || 'User'}</p>
          <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">{subtitle}</p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <ControlButton
              onClick={toggleMute}
              active={muted}
              label={muted ? 'Unmute' : 'Mute'}
              icon={muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            />
            <EndCallButton onClick={hangUp} className="h-12 w-16 sm:h-14 sm:w-20" />
          </div>

          <AudioSink stream={remoteStream} />
        </div>
      </div>
    );
  }

  // ── Video call: large Meet-style window ─────────────────────────────────────
  const showRemoteVideo = phase === 'active' && !!remoteStream;
  const showLocalPreviewAsMain = !showRemoteVideo && !!localStream && !cameraOff;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm sm:p-8">
      <div
        ref={shellRef}
        className={cn(
          'relative flex w-full flex-col overflow-hidden bg-neutral-950 shadow-2xl',
          isFullscreen
            ? 'h-full max-h-none w-full max-w-none rounded-none'
            : 'h-full sm:h-[76vh] sm:max-h-[580px] sm:max-w-2xl lg:max-w-3xl sm:rounded-3xl sm:border sm:border-white/10',
        )}
      >
        {/* Header: who you're with + status + minimize / fullscreen */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-9 ring-1 ring-white/20">
              {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
              <AvatarFallback className="bg-white/10 text-xs text-white">
                {initials(peerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{peerName || 'User'}</p>
              <p className="truncate text-xs tabular-nums text-white/60">{headerStatus}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="Minimize call"
              title="Minimize call"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 active:scale-95"
            >
              <Minimize2 className="size-5" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 active:scale-95"
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>

        {/* Stage: remote video once live; your own preview while it rings */}
        <div className="relative flex-1 overflow-hidden bg-black">
          {showRemoteVideo ? (
            <VideoTile stream={remoteStream} muted={false} className="h-full w-full object-cover" />
          ) : showLocalPreviewAsMain ? (
            <VideoTile stream={localStream} muted mirror className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <Avatar className="size-24 ring-2 ring-white/15">
                {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
                <AvatarFallback className="bg-white/10 text-4xl text-white">
                  {initials(peerName)}
                </AvatarFallback>
              </Avatar>
              <p className="text-base font-medium text-white/90">{subtitle}</p>
            </div>
          )}

          {/* Self-view picture-in-picture once the call is live */}
          {phase === 'active' && (
            <div className="absolute bottom-4 right-4 aspect-[3/4] w-24 overflow-hidden rounded-xl border border-white/20 bg-neutral-900 shadow-lg sm:w-32">
              {localStream && !cameraOff ? (
                <VideoTile stream={localStream} muted mirror className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <VideoOff className="size-6 text-white/50" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Control bar: mic + camera, then End set apart (Meet-style). */}
        <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-black/40 px-4 py-4 sm:gap-4">
          <ControlButton
            onDark
            onClick={toggleMute}
            active={muted}
            label={muted ? 'Unmute' : 'Mute'}
            icon={muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          />
          <ControlButton
            onDark
            onClick={toggleCamera}
            active={cameraOff}
            label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            icon={cameraOff ? <VideoOff className="size-5" /> : <VideoIcon className="size-5" />}
          />
          <div className="mx-1 h-9 w-px bg-white/15 sm:mx-2" />
          <EndCallButton onClick={hangUp} className="h-12 w-16 sm:h-14 sm:w-20" />
        </div>
      </div>
    </div>
  );
}
