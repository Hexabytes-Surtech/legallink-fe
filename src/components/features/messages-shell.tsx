'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MessageConvo {
  id: string;
  name: string;
  snippet: string;
  status: string;
  unread: number;
}

function initials(name: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

/**
 * Two-pane Messages console (conversation list + active thread) that lives INSIDE a
 * role's sidebar layout — so the primary nav stays put (no full-page redirect).
 * Shared by both citizen and advocate; `basePath` is where each conversation links.
 * On mobile it shows the list, or the thread when one is open.
 */
export function MessagesShell({
  convos, loading, basePath, children,
}: {
  convos: MessageConvo[];
  loading: boolean;
  basePath: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeId = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length + 1).split('/')[0]
    : undefined;
  const hasSelection = !!activeId;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Conversation list */}
      <div className={cn('w-full shrink-0 overflow-y-auto border-r border-border md:w-80', hasSelection && 'hidden md:block')}>
        <div className="border-b border-border px-4 py-3">
          <h1 className="font-display text-lg font-semibold">{t('chat.conversations')}</h1>
        </div>
        {loading && convos.length === 0 ? (
          <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : convos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('chat.noConversations')}</p>
        ) : (
          <ul className="p-2">
            {convos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${basePath}/${c.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent',
                    c.id === activeId && 'bg-accent',
                  )}
                >
                  <span className="relative shrink-0">
                    <Avatar className="size-9"><AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback></Avatar>
                    <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card',
                      c.status === 'accepted' ? 'bg-success' : 'bg-muted-foreground')} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{c.name}</span>
                      {c.unread > 0 && <Badge variant="default" className="h-5 px-1.5">{c.unread}</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.snippet}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Active thread */}
      <div className={cn('min-w-0 flex-1', !hasSelection && 'hidden md:block')}>{children}</div>
    </div>
  );
}
