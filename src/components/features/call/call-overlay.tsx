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

/**
 * Live call timer. Rendered ONLY while the call is active, so it mounts fresh
 * (starting at 00:00) per call and ticks purely from the interval callback —
 * no ref/Date.now reads during render.
 */
function CallTimer() {
  const [secs, setSecs] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <>{`${mm}:${ss}`}</>;
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

/** Round control button used in both call layouts. */
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

function EndCallButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="End call"
      title="End call"
      className="flex h-12 w-20 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition hover:brightness-110 active:scale-95 sm:h-14 sm:w-24"
    >
      <PhoneOff className="size-6" />
    </button>
  );
}

/** Full-screen in-call UI: shown while a call is ringing out, connecting, or live. */
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

  const visible = phase === 'outgoing' || phase === 'connecting' || phase === 'active';
  if (!visible) return null;

  const statusText =
    phase === 'outgoing' ? `Calling ${peerName || 'user'}…` : phase === 'connecting' ? 'Connecting…' : null;

  // ── Voice call: themed modal card (avatar + name + status + controls) ───────
  if (mode === 'voice') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
          <div className="relative mx-auto mb-5 size-28">
            {phase !== 'active' && <span className="absolute inset-0 animate-ping rounded-full bg-gold/20" />}
            <span className="absolute -inset-2 rounded-full border-2 border-gold/30" />
            <Avatar className="relative size-28 ring-2 ring-gold/50">
              {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
              <AvatarFallback className="text-3xl">{initials(peerName)}</AvatarFallback>
            </Avatar>
          </div>

          <p className="text-xl font-semibold text-card-foreground">{peerName || 'User'}</p>
          <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
            {statusText ?? <CallTimer />}
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <ControlButton
              onClick={toggleMute}
              active={muted}
              label={muted ? 'Unmute' : 'Mute'}
              icon={muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            />
            <EndCallButton onClick={hangUp} />
          </div>
        </div>

        <AudioSink stream={remoteStream} />
      </div>
    );
  }

  // ── Video call: large Meet-style window (video first, fullscreen toggle) ────
  const showRemoteVideo = phase === 'active' && !!remoteStream;
  const showLocalPreviewAsMain = !showRemoteVideo && !!localStream && !cameraOff;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6">
      <div
        ref={shellRef}
        className={cn(
          'relative flex w-full flex-col overflow-hidden bg-neutral-950',
          isFullscreen
            ? 'h-full'
            : 'h-full max-h-[46rem] max-w-6xl rounded-2xl border border-white/10 shadow-2xl',
        )}
      >
        {/* Header: who you're talking to + live timer */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-8 ring-1 ring-white/20">
              {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
              <AvatarFallback className="bg-white/10 text-xs text-white">{initials(peerName)}</AvatarFallback>
            </Avatar>
            <p className="truncate text-sm font-medium text-white">{peerName || 'User'}</p>
          </div>
          <p className="shrink-0 text-sm tabular-nums text-white/70">
            {phase === 'active' ? <CallTimer /> : statusText}
          </p>
        </div>

        {/* Stage: remote video once live; your own preview while it rings */}
        <div className="relative flex-1 overflow-hidden bg-black">
          {showRemoteVideo ? (
            <VideoTile stream={remoteStream} muted={false} className="h-full w-full object-cover" />
          ) : showLocalPreviewAsMain ? (
            <VideoTile stream={localStream} muted mirror className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Avatar className="size-28 ring-2 ring-white/20">
                {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
                <AvatarFallback className="bg-white/10 text-4xl text-white">{initials(peerName)}</AvatarFallback>
              </Avatar>
              <p className="text-lg font-medium text-white">{peerName || 'User'}</p>
            </div>
          )}

          {/* Ringing/connecting status over the preview */}
          {statusText && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-sm text-white backdrop-blur">
              {statusText}
            </div>
          )}

          {/* Your own picture-in-picture once the call is live */}
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

        {/* Control bar */}
        <div className="flex items-center justify-center gap-3 bg-black/40 px-4 py-3.5 sm:gap-4">
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
          <EndCallButton onClick={hangUp} />
          <ControlButton
            onDark
            onClick={toggleFullscreen}
            label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            icon={isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          />
        </div>
      </div>
    </div>
  );
}
