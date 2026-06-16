'use client';

import * as React from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

/**
 * Resource "topics" the backend tags its `data:changed` events with. A change to a
 * topic (a) lets any open view of that resource silently refetch and (b) lights up a
 * sidebar badge for the section — unless the user is already looking at it.
 */
export type RealtimeTopic =
  | 'consultations'      // a citizen's / advocate's consultation list + dashboards
  | 'messages'           // new chat message landed (bridged from the legacy unread_bump)
  | 'verification'       // this advocate's own verification status changed
  | 'admin-advocates'    // the admin advocate-verification queue changed
  | 'admin-reports'      // the admin citizen-reports queue changed
  | 'admin-moderation';  // the admin flagged-messages queue changed

type ChangeHandler = (topic: RealtimeTopic) => void;
interface Subscription {
  topics: RealtimeTopic[];
  fn: ChangeHandler;
}

interface RealtimeValue {
  /** Topics with an unseen change since the user last viewed that section. */
  unseen: Partial<Record<RealtimeTopic, boolean>>;
  /** Clear the badge for a topic (e.g. the user opened that section). */
  markSeen: (topic: RealtimeTopic) => void;
  /** Declare which topics the user is currently viewing — suppresses their badges. */
  setActiveTopics: (topics: RealtimeTopic[]) => void;
  /** Subscribe a handler to one or more topics; returns an unsubscribe fn. */
  subscribe: (topics: RealtimeTopic[], fn: ChangeHandler) => () => void;
}

const RealtimeContext = React.createContext<RealtimeValue | null>(null);

/**
 * One app-wide connection to the `/notify` socket channel. Replaces the per-list
 * `useNotificationsSocket` connections with a single shared one that fans changes out
 * to (a) registered refetch handlers and (b) the sidebar badge state. Mounted inside
 * AuthProvider; idle (no socket) until the user is signed in.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [unseen, setUnseen] = React.useState<Partial<Record<RealtimeTopic, boolean>>>({});
  const subsRef = React.useRef<Set<Subscription>>(new Set());
  const activeRef = React.useRef<Set<RealtimeTopic>>(new Set());

  const markSeen = React.useCallback((topic: RealtimeTopic) => {
    setUnseen((prev) => (prev[topic] ? { ...prev, [topic]: false } : prev));
  }, []);

  const setActiveTopics = React.useCallback(
    (topics: RealtimeTopic[]) => {
      activeRef.current = new Set(topics);
      // Entering a section clears any pending badge for it.
      topics.forEach((t) => markSeen(t));
    },
    [markSeen],
  );

  const subscribe = React.useCallback((topics: RealtimeTopic[], fn: ChangeHandler) => {
    const entry: Subscription = { topics, fn };
    subsRef.current.add(entry);
    return () => {
      subsRef.current.delete(entry);
    };
  }, []);

  const dispatch = React.useCallback((topic: RealtimeTopic) => {
    // 1) Let every open view of this resource refetch (a handler throw must not kill
    //    the socket or starve the other handlers).
    subsRef.current.forEach((s) => {
      if (s.topics.includes(topic)) {
        try {
          s.fn(topic);
        } catch {
          /* ignore */
        }
      }
    });
    // 2) Badge the section — unless the user is already looking at it.
    if (!activeRef.current.has(topic)) {
      setUnseen((prev) => (prev[topic] ? prev : { ...prev, [topic]: true }));
    }
  }, []);

  React.useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${WS_URL}/notify`, {
      query: { token: accessToken },
      transports: ['websocket'],
      forceNew: true,
    });
    socket.on('data:changed', (p: { topic?: RealtimeTopic }) => {
      if (p?.topic) dispatch(p.topic);
    });
    // Legacy event: a new chat message → treat as a 'messages' change.
    socket.on('unread_bump', () => dispatch('messages'));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [accessToken, dispatch]);

  const value = React.useMemo<RealtimeValue>(
    () => ({ unseen, markSeen, setActiveTopics, subscribe }),
    [unseen, markSeen, setActiveTopics, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext(): RealtimeValue {
  const ctx = React.useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeContext must be used within RealtimeProvider');
  return ctx;
}

/**
 * Silently re-run `onChange` whenever any of `topics` changes live. Drop this into a
 * list/dashboard page so it stays fresh without a manual refresh. The callback is held
 * in a ref, so passing an inline arrow function won't churn the subscription.
 */
export function useRealtime(topics: RealtimeTopic[], onChange: () => void): void {
  const { subscribe } = useRealtimeContext();
  const cbRef = React.useRef(onChange);
  React.useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  const key = topics.join(',');
  React.useEffect(() => {
    const unsub = subscribe(topics, () => cbRef.current?.());
    return unsub;
    // topics is reconstructed from the stable `key`; subscribe is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subscribe]);
}
