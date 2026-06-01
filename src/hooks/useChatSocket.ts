'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import type { WsMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export type ChatStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type ChatMessage = WsMessage & { optimistic?: boolean };

export interface UseChatSocket {
  status: ChatStatus;
  messages: ChatMessage[];
  peerTyping: boolean;
  closed: boolean;
  error: string | null;
  send: (text: string) => void;
  setTyping: (isTyping: boolean) => void;
}

/**
 * Live consultation chat over Socket.IO (namespace /ws).
 * - optimistic echo of the sender's own messages
 * - Rule-36 flagged messages stay visible to the SENDER ONLY as "under review"
 * - closed consultations load history but block sending
 */
export function useChatSocket(
  consultationId: string | undefined,
  token: string | null,
  self?: { id?: string; type: 'citizen' | 'advocate' },
): UseChatSocket {
  const selfId = self?.id;
  const selfType: 'citizen' | 'advocate' = self?.type ?? 'citizen';
  const tmpCounter = React.useRef(0);
  const [status, setStatus] = React.useState<ChatStatus>('connecting');
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [peerTyping, setPeerTyping] = React.useState(false);
  const [closed, setClosed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const socketRef = React.useRef<Socket | null>(null);
  const peerTypingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = React.useRef(false);

  React.useEffect(() => {
    if (!consultationId || !token) return;

    const socket = io(`${WS_URL}/ws`, {
      query: { token, consultationId },
      transports: ['websocket'],
      forceNew: true,
    });
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));

    socket.on('history', (history: WsMessage[]) => {
      if (Array.isArray(history)) setMessages(history.map((m) => ({ ...m })));
    });

    socket.on('message', (msg: WsMessage) => {
      setMessages((prev) => {
        // de-dupe by id
        if (prev.some((m) => m.messageId === msg.messageId && !m.optimistic)) return prev;
        // reconcile our own optimistic echo (same sender + text)
        const idx = prev.findIndex(
          (m) => m.optimistic && m.senderType === msg.senderType && m.text === msg.text,
        );
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...msg };
          return next;
        }
        return [...prev, { ...msg }];
      });
    });

    socket.on('typing', (data: { senderId?: string; isTyping: boolean }) => {
      if (selfId && data.senderId === selfId) return; // ignore own echo
      setPeerTyping(!!data.isTyping);
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
      if (data.isTyping) peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
    });

    socket.on('warning', (w: { code: string; message?: string }) => {
      if (w.code === 'CONSULTATION_CLOSED') {
        setClosed(true);
      } else if (w.code === 'MESSAGE_FLAGGED') {
        // mark the most recent optimistic message as under review
        setMessages((prev) => {
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].optimistic && next[i].moderationStatus === 'pending') {
              next[i] = { ...next[i], moderationStatus: 'flagged' };
              break;
            }
          }
          return next;
        });
      }
    });

    socket.on('error', (e: { code?: string; message?: string }) => {
      setStatus('error');
      setError(e?.message || e?.code || 'Connection error');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      if (peerTypingTimer.current) clearTimeout(peerTypingTimer.current);
    };
  }, [consultationId, token, selfId]);

  const send = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const socket = socketRef.current;
      if (!trimmed || !socket || closed) return;
      socket.emit('message', { text: trimmed });
      // optimistic echo (visible immediately; reconciled or flagged on server reply)
      const id = `tmp-${tmpCounter.current++}`;
      setMessages((prev) => [
        ...prev,
        {
          messageId: id,
          senderType: selfType,
          senderId: selfId ?? 'me',
          text: trimmed,
          moderationStatus: 'pending',
          timestamp: new Date().toISOString(),
          optimistic: true,
        },
      ]);
    },
    [closed, selfId, selfType],
  );

  const setTyping = React.useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket || closed) return;
    if (isTyping === typingSentRef.current) return;
    typingSentRef.current = isTyping;
    socket.emit('typing', { isTyping });
  }, [closed]);

  return { status, messages, peerTyping, closed, error, send, setTyping };
}
