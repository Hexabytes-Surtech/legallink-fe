'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingCallModal } from '@/components/features/call/incoming-call-modal';
import { CallOverlay } from '@/components/features/call/call-overlay';
import { startRinging, stopRinging, unlockAudio } from '@/lib/call/ringtone';
import { registerPushSubscription } from '@/lib/call/push';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export type CallMode = 'video' | 'voice';
export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active';

interface IncomingCall {
  callId: string;
  fromName: string;
  mode: CallMode;
}

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallContextValue {
  phase: CallPhase;
  mode: CallMode;
  peerName: string;
  peerAvatar: string | null;
  muted: boolean;
  cameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incoming: IncomingCall | null;
  /** True once the signaling socket is connected (calls can be placed/received). */
  canCall: boolean;
  /** Citizen or advocate starts a 1:1 call on an active consultation. */
  startCall: (
    consultationId: string,
    peerName: string,
    mode: CallMode,
    peerAvatarUrl?: string | null,
  ) => void;
  accept: () => void;
  reject: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = React.createContext<CallContextValue | null>(null);

const STUN_FALLBACK: IceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

function mediaErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera/microphone permission was denied.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No camera or microphone was found.';
  if (name === 'NotReadableError')
    return 'Your camera/microphone is already in use by another app.';
  return 'Could not access your camera or microphone.';
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuth();

  // ── Rendered state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = React.useState<CallPhase>('idle');
  const [mode, setMode] = React.useState<CallMode>('video');
  const [peerName, setPeerName] = React.useState('');
  const [peerAvatar, setPeerAvatar] = React.useState<string | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [cameraOff, setCameraOff] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [incoming, setIncoming] = React.useState<IncomingCall | null>(null);
  const [canCall, setCanCall] = React.useState(false);

  // ── Engine refs (closure-safe source of truth) ──────────────────────────────
  const socketRef = React.useRef<Socket | null>(null);
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const iceServersRef = React.useRef<IceServer[]>(STUN_FALLBACK);
  const callIdRef = React.useRef<string | null>(null);
  const roleRef = React.useRef<'caller' | 'callee' | null>(null);
  const modeRef = React.useRef<CallMode>('video');
  const phaseRef = React.useRef<CallPhase>('idle');
  const remoteSetRef = React.useRef(false);
  const pendingCandidatesRef = React.useRef<RTCIceCandidateInit[]>([]);
  const myNameRef = React.useRef('Someone');
  const myAvatarRef = React.useRef<string | null>(null);
  const actionsRef = React.useRef<Partial<CallContextValue>>({});

  React.useEffect(() => {
    myNameRef.current = user?.name?.trim() || 'Someone';
    myAvatarRef.current = user?.avatar_url ?? null;
  }, [user?.name, user?.avatar_url]);

  // Foreground call ring. Browsers only allow audio from a user gesture, so unlock
  // the AudioContext on the first pointer/key event after load.
  React.useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Ring while a call is ringing in (callee) or out (caller); stop otherwise.
  React.useEffect(() => {
    if (phase === 'incoming') startRinging('incoming');
    else if (phase === 'outgoing') startRinging('outgoing');
    else stopRinging();
    return () => stopRinging();
  }, [phase]);

  // Keep the push subscription fresh: if the user already granted notification
  // permission, silently re-register this device's endpoint whenever authenticated.
  React.useEffect(() => {
    if (!accessToken) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    void registerPushSubscription();
  }, [accessToken]);

  // "Decline" tapped on a push notification reaches us (only when a window is open)
  // as a service-worker message — reject that specific call server-side.
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; callId?: string } | null;
      if (data?.type === 'call-decline' && data.callId) {
        socketRef.current?.emit('call:reject', { callId: data.callId });
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  React.useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${WS_URL}/call`, {
      query: { token: accessToken },
      transports: ['websocket'],
      forceNew: true,
    });
    socketRef.current = socket;

    const applyPhase = (p: CallPhase) => {
      phaseRef.current = p;
      setPhase(p);
    };

    const emit = (event: string, payload: Record<string, unknown>) => socket.emit(event, payload);

    const resetCall = () => {
      const pc = pcRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        try {
          pc.close();
        } catch {
          /* already closed */
        }
        pcRef.current = null;
      }
      const ls = localStreamRef.current;
      if (ls) {
        ls.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
      setIncoming(null);
      setMuted(false);
      setCameraOff(false);
      setPeerName('');
      setPeerAvatar(null);
      callIdRef.current = null;
      roleRef.current = null;
      remoteSetRef.current = false;
      pendingCandidatesRef.current = [];
      iceServersRef.current = STUN_FALLBACK;
      applyPhase('idle');
    };

    const getLocalMedia = async (m: CallMode): Promise<MediaStream> => {
      const constraints: MediaStreamConstraints =
        m === 'video' ? { video: { facingMode: 'user' }, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMuted(false);
      setCameraOff(false);
      return stream;
    };

    const fetchIceServers = async () => {
      try {
        const data = await api.get<{ iceServers: IceServer[] }>('/calls/ice-servers');
        iceServersRef.current = data?.iceServers?.length ? data.iceServers : STUN_FALLBACK;
      } catch {
        iceServersRef.current = STUN_FALLBACK;
      }
    };

    const flushCandidates = async () => {
      const pc = pcRef.current;
      if (!pc) return;
      const queued = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          /* ignore bad candidate */
        }
      }
    };

    const createPeerConnection = (): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pc.onicecandidate = (e) => {
        if (e.candidate && callIdRef.current) {
          emit('call:ice', { callId: callIdRef.current, candidate: e.candidate.toJSON() });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) setRemoteStream(e.streams[0]);
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === 'connected') {
          applyPhase('active');
        } else if (st === 'failed') {
          toast.error('Call connection failed.');
          hangUp();
        }
      };
      pcRef.current = pc;
      return pc;
    };

    const addLocalTracks = (pc: RTCPeerConnection) => {
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    };

    const localDesc = (pc: RTCPeerConnection) => ({
      type: pc.localDescription?.type,
      sdp: pc.localDescription?.sdp,
    });

    // ── Actions (exposed via context) ─────────────────────────────────────────

    const startCall = async (
      consultationId: string,
      peer: string,
      m: CallMode,
      peerAvatarUrl?: string | null,
    ) => {
      if (phaseRef.current !== 'idle') return;
      if (!socket.connected) {
        toast.error('Still connecting — please try again in a moment.');
        return;
      }
      roleRef.current = 'caller';
      modeRef.current = m;
      setMode(m);
      setPeerName(peer);
      setPeerAvatar(peerAvatarUrl ?? null);
      applyPhase('outgoing');
      try {
        await getLocalMedia(m);
      } catch (err) {
        toast.error(mediaErrorMessage(err));
        resetCall();
        return;
      }
      await fetchIceServers();
      emit('call:invite', {
        consultationId,
        mode: m,
        fromName: myNameRef.current,
        fromAvatar: myAvatarRef.current,
      });
    };

    const accept = async () => {
      const callId = callIdRef.current;
      const m = modeRef.current;
      if (!callId || phaseRef.current !== 'incoming') return;
      setIncoming(null);
      applyPhase('connecting');
      try {
        await getLocalMedia(m);
      } catch (err) {
        toast.error(mediaErrorMessage(err));
        emit('call:reject', { callId });
        resetCall();
        return;
      }
      await fetchIceServers();
      const pc = createPeerConnection();
      addLocalTracks(pc);
      emit('call:accept', { callId }); // caller will now send the offer
    };

    const reject = () => {
      const callId = callIdRef.current;
      if (callId) emit('call:reject', { callId });
      resetCall();
    };

    const hangUp = () => {
      const callId = callIdRef.current;
      if (callId) {
        if (roleRef.current === 'caller' && phaseRef.current === 'outgoing') {
          emit('call:cancel', { callId });
        } else {
          emit('call:end', { callId });
        }
      }
      resetCall();
    };

    const toggleMute = () => {
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    };

    const toggleCamera = () => {
      const track = localStreamRef.current?.getVideoTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      setCameraOff(!track.enabled);
    };

    actionsRef.current = { startCall, accept, reject, hangUp, toggleMute, toggleCamera };

    // ── Socket lifecycle ──────────────────────────────────────────────────────
    socket.on('connect', () => {
      setCanCall(true);
      // Ask the server to re-ring any call that arrived while we were away (e.g. the
      // app was opened from a push notification, or the socket just reconnected).
      socket.emit('call:pending', {});
    });
    socket.on('disconnect', () => setCanCall(false));
    socket.on('connect_error', () => setCanCall(false));

    // ── Caller-side signaling ─────────────────────────────────────────────────
    socket.on('call:ringing', (p: { callId: string }) => {
      // If the user hung up before the server confirmed the ring, we had no
      // callId to cancel with — cancel now so the callee doesn't keep ringing.
      if (phaseRef.current !== 'outgoing') {
        emit('call:cancel', { callId: p.callId });
        return;
      }
      callIdRef.current = p.callId;
    });

    socket.on('call:accepted', async (p: { callId: string }) => {
      if (callIdRef.current !== p.callId) return;
      applyPhase('connecting');
      const pc = createPeerConnection();
      addLocalTracks(pc);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emit('call:offer', { callId: p.callId, sdp: localDesc(pc) });
      } catch {
        toast.error('Could not start the call.');
        hangUp();
      }
    });

    socket.on('call:answer', async (p: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(p.sdp);
        remoteSetRef.current = true;
        await flushCandidates();
      } catch {
        /* ignore */
      }
    });

    // ── Callee-side signaling ─────────────────────────────────────────────────
    socket.on(
      'call:incoming',
      (p: { callId: string; fromName: string; mode: CallMode; fromAvatar?: string | null }) => {
        if (phaseRef.current !== 'idle') return; // safety; server already guards busy
        callIdRef.current = p.callId;
        roleRef.current = 'callee';
        modeRef.current = p.mode;
        setMode(p.mode);
        setPeerName(p.fromName);
        setPeerAvatar(p.fromAvatar ?? null);
        setIncoming({ callId: p.callId, fromName: p.fromName, mode: p.mode });
        applyPhase('incoming');
      },
    );

    socket.on('call:offer', async (p: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(p.sdp);
        remoteSetRef.current = true;
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit('call:answer', { callId: p.callId, sdp: localDesc(pc) });
      } catch {
        toast.error('Could not connect the call.');
        hangUp();
      }
    });

    // ── Shared ICE + terminal events ──────────────────────────────────────────
    socket.on('call:ice', async (p: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc || !p.candidate) return;
      if (remoteSetRef.current) {
        try {
          await pc.addIceCandidate(p.candidate);
        } catch {
          /* ignore */
        }
      } else {
        pendingCandidatesRef.current.push(p.candidate);
      }
    });

    socket.on('call:rejected', () => {
      toast('Call declined.');
      resetCall();
    });
    socket.on('call:busy', () => {
      toast('They are already on another call.');
      resetCall();
    });
    socket.on('call:unavailable', () => {
      toast('They are offline right now.');
      resetCall();
    });
    socket.on('call:timeout', () => {
      toast('No answer.');
      resetCall();
    });
    socket.on('call:cancelled', () => {
      resetCall();
    });
    socket.on('call:dismiss', () => {
      resetCall();
    });
    socket.on('call:ended', () => {
      toast('Call ended.');
      resetCall();
    });
    socket.on('call:error', (e: { message?: string }) => {
      toast.error(e?.message || 'Call failed.');
      resetCall();
    });

    return () => {
      // Tear down any live call, then drop the socket.
      resetCall();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      actionsRef.current = {};
      setCanCall(false);
    };
  }, [accessToken]);

  // Stable wrappers so consumers never get a changing function identity.
  const startCall = React.useCallback<CallContextValue['startCall']>((c, p, m, a) => {
    actionsRef.current.startCall?.(c, p, m, a);
  }, []);
  const accept = React.useCallback(() => actionsRef.current.accept?.(), []);
  const reject = React.useCallback(() => actionsRef.current.reject?.(), []);
  const hangUp = React.useCallback(() => actionsRef.current.hangUp?.(), []);
  const toggleMute = React.useCallback(() => actionsRef.current.toggleMute?.(), []);
  const toggleCamera = React.useCallback(() => actionsRef.current.toggleCamera?.(), []);

  const value: CallContextValue = {
    phase,
    mode,
    peerName,
    peerAvatar,
    muted,
    cameraOff,
    localStream,
    remoteStream,
    incoming,
    canCall,
    startCall,
    accept,
    reject,
    hangUp,
    toggleMute,
    toggleCamera,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallModal />
      <CallOverlay />
    </CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const ctx = React.useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
