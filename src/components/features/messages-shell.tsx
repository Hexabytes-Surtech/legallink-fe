'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MessageConvo {
  id: string;
  name: string;
  snippet: string;
  status: string;
  unread: number;
  avatarUrl?: string | null;
  /** Stable id of the other participant — groups one person's matters together. */
  contactId?: string;
  /** Short label for this specific matter/thread (shown when a contact has 2+ matters). */
  matterLabel?: string;
}

interface ContactGroup {
  key: string;
  name: string;
  avatarUrl?: string | null;
  items: MessageConvo[];
}

const COLLAPSE_KEY = 'll_msg_list_collapsed';

function initials(name: string) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="default" className="h-5 min-w-5 justify-center rounded-full px-1.5 tabular-nums">
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

/**
 * Two-pane Messages console (conversation list + active thread) that lives INSIDE a
 * role's sidebar layout — so the primary nav stays put (no full-page redirect).
 * Shared by both citizen and advocate; `basePath` is where each conversation links.
 *
 * Conversations are GROUPED by the other participant (`contactId`): a person you've had
 * several matters with shows as ONE contact whose matters are nested underneath. Each
 * matter is still its own thread.
 *
 * On desktop the whole list can be COLLAPSED to an avatar-only rail to reclaim space
 * (the choice is remembered). On mobile it shows the list, or the thread when one is open.
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

  // Desktop-only collapse to an avatar rail; remembered across visits.
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);
  React.useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Group by contact, preserving the backend's most-recent-first order.
  const groups = React.useMemo<ContactGroup[]>(() => {
    const map = new Map<string, ContactGroup>();
    for (const c of convos) {
      const key = c.contactId || c.name;
      const g = map.get(key);
      if (g) g.items.push(c);
      else map.set(key, { key, name: c.name, avatarUrl: c.avatarUrl, items: [c] });
    }
    return Array.from(map.values());
  }, [convos]);

  const activeGroupKey = React.useMemo(
    () => groups.find((g) => g.items.some((i) => i.id === activeId))?.key,
    [groups, activeId],
  );

  // A multi-matter group is open if the user toggled it, else when it holds the active thread.
  const [expandedMap, setExpandedMap] = React.useState<Record<string, boolean>>({});
  const isOpen = (key: string) => expandedMap[key] ?? key === activeGroupKey;
  const toggle = (key: string) =>
    setExpandedMap((m) => ({ ...m, [key]: !(m[key] ?? key === activeGroupKey) }));
  const expandGroup = (key: string) => setExpandedMap((m) => ({ ...m, [key]: true }));

  const statusDot = (active: boolean) =>
    cn('size-2.5 rounded-full ring-2 ring-card', active ? 'bg-success' : 'bg-muted-foreground');

  const groupUnread = (g: ContactGroup) => g.items.reduce((n, i) => n + (i.unread || 0), 0);
  const groupActive = (g: ContactGroup) => g.items.some((i) => i.status === 'accepted');
  const groupHasOpen = (g: ContactGroup) => g.items.some((i) => i.id === activeId);

  // A single top-level conversation row (contact with exactly one matter).
  function topRow(c: MessageConvo) {
    return (
      <Link
        href={`${basePath}/${c.id}`}
        className={cn(
          'flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent',
          c.id === activeId && 'bg-accent',
        )}
      >
        <span className="relative shrink-0">
          <Avatar className="size-9">
            {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
            <AvatarFallback className="text-xs">{initials(c.name)}</AvatarFallback>
          </Avatar>
          <span className={cn('absolute -bottom-0.5 -right-0.5', statusDot(c.status === 'accepted'))} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{c.name}</span>
            <UnreadBadge count={c.unread} />
          </span>
          <span className="block truncate text-xs text-muted-foreground">{c.matterLabel || c.snippet}</span>
        </span>
      </Link>
    );
  }

  // A nested matter row under a contact that has several matters.
  function matterRow(c: MessageConvo) {
    return (
      <Link
        href={`${basePath}/${c.id}`}
        className={cn(
          'flex items-center gap-2 rounded-lg py-1.5 pl-2.5 pr-2 transition-colors hover:bg-accent',
          c.id === activeId && 'bg-accent',
        )}
      >
        <span className={cn('size-2 shrink-0 rounded-full', c.status === 'accepted' ? 'bg-success' : 'bg-muted-foreground/50')} />
        <span className="min-w-0 flex-1 truncate text-sm">{c.matterLabel || c.snippet}</span>
        <UnreadBadge count={c.unread} />
      </Link>
    );
  }

  // The avatar shown in the collapsed rail (with status dot + unread bubble).
  function railAvatar(g: ContactGroup) {
    const unread = groupUnread(g);
    return (
      <span className="relative">
        <Avatar className={cn('size-10', groupHasOpen(g) && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
          {g.avatarUrl && <AvatarImage src={g.avatarUrl} alt={g.name} />}
          <AvatarFallback className="text-xs">{initials(g.name)}</AvatarFallback>
        </Avatar>
        <span className={cn('absolute -bottom-0.5 -right-0.5', statusDot(groupActive(g)))} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Conversation list / rail */}
      <div
        className={cn(
          'w-full shrink-0 overflow-y-auto border-r border-border transition-[width] duration-200',
          hasSelection && 'hidden md:block',
          collapsed ? 'md:w-16' : 'md:w-80',
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center border-b border-border px-4 py-3', collapsed ? 'md:justify-center md:px-2' : 'justify-between')}>
          <h1 className={cn('font-display text-lg font-semibold', collapsed && 'md:hidden')}>{t('chat.conversations')}</h1>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
            aria-label={collapsed ? t('chat.expandList') : t('chat.collapseList')}
            title={collapsed ? t('chat.expandList') : t('chat.collapseList')}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* Expanded list — always on mobile; on desktop when not collapsed */}
        <div className={cn(collapsed && 'md:hidden')}>
          {loading && convos.length === 0 ? (
            <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : convos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('chat.noConversations')}</p>
          ) : (
            <ul className="space-y-0.5 p-2">
              {groups.map((g) => {
                if (g.items.length === 1) {
                  return <li key={g.key}>{topRow(g.items[0])}</li>;
                }
                const open = isOpen(g.key);
                return (
                  <li key={g.key}>
                    <button
                      type="button"
                      onClick={() => toggle(g.key)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                      aria-expanded={open}
                    >
                      <span className="relative shrink-0">
                        <Avatar className="size-9">
                          {g.avatarUrl && <AvatarImage src={g.avatarUrl} alt={g.name} />}
                          <AvatarFallback className="text-xs">{initials(g.name)}</AvatarFallback>
                        </Avatar>
                        <span className={cn('absolute -bottom-0.5 -right-0.5', statusDot(groupActive(g)))} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{g.name}</span>
                          <UnreadBadge count={groupUnread(g)} />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{g.items.length} {t('chat.matters')}</span>
                      </span>
                      {open
                        ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                    </button>
                    {open && (
                      <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {g.items.map((c) => <li key={c.id}>{matterRow(c)}</li>)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Collapsed rail — desktop only, avatars only */}
        <div className={cn('hidden', collapsed && 'md:block')}>
          <ul className="flex flex-col items-center gap-1 px-2 py-2">
            {groups.map((g) => {
              const cls = cn(
                'flex items-center justify-center rounded-xl p-1 transition-colors hover:bg-accent',
                groupHasOpen(g) && 'bg-accent',
              );
              return (
                <li key={g.key}>
                  {g.items.length === 1 ? (
                    <Link href={`${basePath}/${g.items[0].id}`} title={g.name} className={cls}>
                      {railAvatar(g)}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      title={g.name}
                      onClick={() => { setCollapsed(false); expandGroup(g.key); }}
                      className={cls}
                    >
                      {railAvatar(g)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Active thread */}
      <div className={cn('min-w-0 flex-1', !hasSelection && 'hidden md:block')}>{children}</div>
    </div>
  );
}
