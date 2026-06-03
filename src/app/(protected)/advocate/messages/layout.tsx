'use client';

import * as React from 'react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { MessagesShell, type MessageConvo } from '@/components/features/messages-shell';
import type { AdvocateConsultation } from '@/types';

export default function AdvocateMessagesLayout({ children }: { children: React.ReactNode }) {
  const q = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), []);
  const convos: MessageConvo[] = React.useMemo(
    () =>
      (q.data ?? [])
        .filter((c) => c.status === 'accepted' || c.status === 'closed')
        .map((c) => ({
          id: c.id,
          name: c.citizen_name || 'Citizen',
          snippet: c.query_text,
          status: c.status,
          unread: 0,
        })),
    [q.data],
  );

  return (
    <MessagesShell convos={convos} loading={q.loading} basePath="/advocate/messages">
      {children}
    </MessagesShell>
  );
}
