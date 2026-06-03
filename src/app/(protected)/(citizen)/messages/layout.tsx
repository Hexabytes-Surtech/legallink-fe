'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { MessagesShell, type MessageConvo } from '@/components/features/messages-shell';
import type { ConsultationListItem } from '@/types';

export default function CitizenMessagesLayout({ children }: { children: React.ReactNode }) {
  const q = useQuery<ConsultationListItem[]>(() => api.get('/consultations'), []);
  const convos: MessageConvo[] = React.useMemo(
    () =>
      (q.data ?? [])
        .filter((c) => c.status === 'accepted' || c.status === 'closed')
        .map((c) => ({
          id: c.consultationId,
          name: c.advocateName || 'Advocate',
          snippet: c.matterBrief || c.query,
          status: c.status,
          unread: c.unread ?? 0,
        })),
    [q.data],
  );

  return (
    <MessagesShell convos={convos} loading={q.loading} basePath="/messages">
      {children}
    </MessagesShell>
  );
}
