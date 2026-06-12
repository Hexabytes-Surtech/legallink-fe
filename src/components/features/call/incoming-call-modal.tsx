'use client';

import * as React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

function initials(name: string) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

/** Full-screen ring shown anywhere in the app when a 1:1 call comes in. */
export function IncomingCallModal() {
  const { phase, incoming, peerName, peerAvatar, accept, reject } = useCall();

  if (phase !== 'incoming' || !incoming) return null;

  const isVideo = incoming.mode === 'video';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
        {/* Caller avatar with a pulsing ring while it rings */}
        <div className="relative mx-auto mb-5 size-24">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/25" />
          <span className="absolute -inset-2 rounded-full border-2 border-gold/30" />
          <Avatar className="relative size-24 ring-2 ring-gold/50">
            {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
            <AvatarFallback className="text-2xl">{initials(peerName)}</AvatarFallback>
          </Avatar>
        </div>

        <p className="text-xl font-semibold text-card-foreground">{peerName || 'Someone'}</p>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          {isVideo ? <Video className="size-4" /> : <Phone className="size-4" />}
          Incoming {isVideo ? 'video' : 'voice'} call
        </p>

        <div className="mt-8 flex items-center justify-center gap-12">
          <button
            type="button"
            onClick={reject}
            aria-label="Decline call"
            className="group flex flex-col items-center gap-2"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition group-hover:scale-105 group-active:scale-95">
              <PhoneOff className="size-6" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">Decline</span>
          </button>

          <button
            type="button"
            onClick={accept}
            aria-label="Accept call"
            className="group flex flex-col items-center gap-2"
          >
            <span className="flex size-14 animate-pulse items-center justify-center rounded-full bg-success text-white shadow-lg transition group-hover:scale-105 group-active:scale-95">
              {isVideo ? <Video className="size-6" /> : <Phone className="size-6" />}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
