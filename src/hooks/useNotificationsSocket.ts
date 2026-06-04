'use client';

import * as React from 'react';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export interface UnreadBump {
  consultationId: string;
}

/**
 * Connects to the user-level notification channel (namespace /notify) and invokes
 * `onBump` whenever a new message lands for this user in ANY conversation. Used by
 * the Messages list to refresh unread badges live. Reconnects only when the token
 * changes; the latest `onBump` is always called via a ref (no churn on re-render).
 */
export function useNotificationsSocket(
  token: string | null | undefined,
  onBump: (bump: UnreadBump) => void,
) {
  const cbRef = React.useRef(onBump);
  React.useEffect(() => { cbRef.current = onBump; }, [onBump]);

  React.useEffect(() => {
    if (!token) return;
    const socket = io(`${WS_URL}/notify`, {
      query: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    socket.on('unread_bump', (p: UnreadBump) => cbRef.current?.(p));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token]);
}
