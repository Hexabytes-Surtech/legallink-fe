'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ConsultationListItem, AdvocateConsultation } from '@/types';

type Convo = { id: string; name: string; snippet: string; status: string; unread: number };

function initials(name: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeId = pathname.split('/')[2]; // /chat/[id]

  const isAdvocate = user?.role === 'advocate';
  const citizenQ = useQuery<ConsultationListItem[]>(() => api.get('/consultations'), [], { enabled: !!user && !isAdvocate });
  const advocateQ = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), [], { enabled: isAdvocate });

  const loading = isAdvocate ? advocateQ.loading : citizenQ.loading;

  const convos: Convo[] = React.useMemo(() => {
    if (isAdvocate) {
      return (advocateQ.data ?? [])
        .filter((c) => c.status === 'accepted' || c.status === 'closed')
        .map((c) => ({ id: c.id, name: c.citizen_name || 'Citizen', snippet: c.query_text, status: c.status, unread: 0 }));
    }
    return (citizenQ.data ?? [])
      .filter((c) => c.status === 'accepted' || c.status === 'closed')
      .map((c) => ({ id: c.consultationId, name: c.advocateName || 'Advocate', snippet: c.matterBrief || c.query, status: c.status, unread: c.unread ?? 0 }));
  }, [isAdvocate, advocateQ.data, citizenQ.data]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 group-data-[state=collapsed]:hidden">
              <MessagesSquare className="size-5 text-gold" />
              <span className="font-display text-sm font-semibold">{t('chat.conversations')}</span>
            </span>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          {loading && convos.length === 0 ? (
            <div className="space-y-2 px-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : convos.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground group-data-[state=collapsed]:hidden">{t('chat.noConversations')}</p>
          ) : (
            <SidebarMenu>
              {convos.map((c) => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton asChild isActive={c.id === activeId} tooltip={c.name} className="h-auto py-2">
                    <Link href={`/chat/${c.id}`}>
                      <span className="relative">
                        <Avatar className="size-8"><AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback></Avatar>
                        <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card',
                          c.status === 'accepted' ? 'bg-success' : 'bg-muted-foreground')} />
                      </span>
                      <span data-sb-hide className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{c.name}</span>
                          {c.unread > 0 && <Badge variant="default" className="h-5 px-1.5">{c.unread}</Badge>}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">{c.snippet}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <div className="sticky top-16 z-10 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">{t('chat.conversations')}</span>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
