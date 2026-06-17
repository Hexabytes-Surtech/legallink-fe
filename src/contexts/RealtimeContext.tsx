'use client';

import * as React from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import type { TranslationKey } from '@/i18n/config';

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

/**
 * Semantic label the backend can attach to a `data:changed` event so the client can
 * raise an accurate toast ("New consultation request" vs a vague "Consultation
 * updated"). A topic can carry several kinds (e.g. `consultations` → requested /
 * accepted / declined / closed). Kinds without a mapping below just refetch + badge
 * silently — no toast.
 */
type RealtimeKind =
  | 'consultation_requested'
  | 'consultation_accepted'
  | 'consultation_declined'
  | 'consultation_closed'
  | 'verification_approved'
  | 'verification_rejected'
  | 'advocate_submitted'
  | 'report_filed'
  | 'message';

/** Which kinds raise a toast, and the i18n key for their text. */
const KIND_TOAST: Record<RealtimeKind, TranslationKey> = {
  consultation_requested: 'rt.toast.consultation_requested',
  consultation_accepted: 'rt.toast.consultation_accepted',
  consultation_declined: 'rt.toast.consultation_declined',
  consultation_closed: 'rt.toast.consultation_closed',
  verification_approved: 'rt.toast.verification_approved',
  verification_rejected: 'rt.toast.verification_rejected',
  advocate_submitted: 'rt.toast.advocate_submitted',
  report_filed: 'rt.toast.report_filed',
  message: 'rt.toast.message',
};

/** Where "View" on a toast should take the user, by role + topic. */
function hrefFor(role: string | undefined, topic: RealtimeTopic): string {
  switch (topic) {
    case 'consultations':
      return role === 'advocate' ? '/advocate/consultations' : '/messages';
    case 'messages':
      return role === 'advocate' ? '/advocate/messages' : '/messages';
    case 'verification':
      return '/advocate/dashboard';
    case 'admin-advocates':
      return '/admin/advocates';
    case 'admin-reports':
      return '/admin/reports';
    case 'admin-moderation':
      return '/admin/messages';
    default:
      return '/';
  }
}

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
 * to (a) registered refetch handlers, (b) the sidebar badge state and (c) a toast
 * (the only live signal visible on mobile, where the sidebar is a hidden sheet).
 * Mounted inside Auth + Language providers; idle (no socket) until the user signs in.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [unseen, setUnseen] = React.useState<Partial<Record<RealtimeTopic, boolean>>>({});
  const subsRef = React.useRef<Set<Subscription>>(new Set());
  const activeRef = React.useRef<Set<RealtimeTopic>>(new Set());

  // Read these inside the stable `dispatch` via refs, so toggling language (new `t`)
  // or navigating (new `router`) never tears down and reconnects the socket.
  const tRef = React.useRef(t);
  const roleRef = React.useRef(user?.role);
  const routerRef = React.useRef(router);
  React.useEffect(() => { tRef.current = t; }, [t]);
  React.useEffect(() => { roleRef.current = user?.role; }, [user?.role]);
  React.useEffect(() => { routerRef.current = router; }, [router]);

  const markSeen = React.useCallback((topic: RealtimeTopic) => {
    setUnseen((prev) => (prev[topic] ? { ...prev, [topic]: false } : prev));
  }, []);

  const setActiveTopics = React.useCallback(
    (topics: RealtimeTopic[]) => {
      activeRef.current = new Set(topics);
      // Entering a section clears any pending badge for it.
      topics.forEach((tp) => markSeen(tp));
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

  const dispatch = React.useCallback((topic: RealtimeTopic, kind?: RealtimeKind) => {
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
    // 2) When the user is NOT already looking at this section: badge it AND raise a
    //    toast. Same gate for both, so we never nag about the screen in view — and the
    //    toast is what a mobile user (no visible sidebar) actually sees.
    if (!activeRef.current.has(topic)) {
      setUnseen((prev) => (prev[topic] ? prev : { ...prev, [topic]: true }));
      const key = kind ? KIND_TOAST[kind] : undefined;
      if (key) {
        const href = hrefFor(roleRef.current, topic);
        toast(tRef.current(key), {
          // Collapse repeats of the same kind into one toast instead of stacking.
          id: `rt-${kind}`,
          action: {
            label: tRef.current('rt.toast.tapToView'),
            onClick: () => {
              markSeen(topic);
              routerRef.current?.push(href);
            },
          },
        });
      }
    }
  }, [markSeen]);

  React.useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${WS_URL}/notify`, {
      query: { token: accessToken },
      transports: ['websocket'],
      forceNew: true,
    });
    socket.on('data:changed', (p: { topic?: RealtimeTopic; kind?: RealtimeKind }) => {
      if (p?.topic) dispatch(p.topic, p.kind);
    });
    // Legacy event: a new chat message → treat as a 'messages' change.
    socket.on('unread_bump', () => dispatch('messages', 'message'));
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
