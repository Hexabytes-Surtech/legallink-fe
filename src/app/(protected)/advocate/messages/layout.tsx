'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth, useNotificationsSocket } from '@/hooks';
import { MessagesShell, type MessageConvo } from '@/components/features/messages-shell';
import type { AdvocateConsultation } from '@/types';

const BASE = '/advocate/messages';

export default function AdvocateMessagesLayout({ children }: { children: React.ReactNode }) {
  const q = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), []);
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const activeId = pathname.startsWith(`${BASE}/`) ? pathname.slice(BASE.length + 1).split('/')[0] : undefined;

  // Live: a new citizen message anywhere → refetch so the badge ticks up instantly.
  useNotificationsSocket(accessToken, () => q.refetch());

  // Opening a conversation marks it read (GET advances advocate_last_read_at), then we
  // refetch the list so its numeric badge clears.
  React.useEffect(() => {
    if (!activeId) return;
    let alive = true;
    api.get(`/advocate/consultations/${activeId}`).catch(() => {}).finally(() => { if (alive) q.refetch(); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  React.useEffect(() => {
    const onFocus = () => q.refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const convos: MessageConvo[] = React.useMemo(
    () =>
      (q.data ?? [])
        .filter((c) => c.status === 'accepted' || c.status === 'closed')
        .map((c) => ({
          id: c.id,
          name: c.citizen_name || 'Citizen',
          snippet: c.query_text,
          status: c.status,
          unread: c.unreadCount ?? 0,
          avatarUrl: c.citizen_avatar_url,
        })),
    [q.data],
  );

  return (
    <MessagesShell convos={convos} loading={q.loading} basePath={BASE}>
      {children}
    </MessagesShell>
  );
}
