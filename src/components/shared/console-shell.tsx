'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarRail, useSidebar,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LanguageToggle } from '@/components/shared/language-toggle';
import { HeaderAccountMenu } from '@/components/shared/header-account-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeContext, type RealtimeTopic } from '@/contexts/RealtimeContext';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

export interface ConsoleNavItem {
  href: string;
  icon: LucideIcon;
  key: TranslationKey;
  /** Active only on an exact path match (e.g. dashboard roots). Default: prefix match. */
  exact?: boolean;
  /**
   * Realtime topics that light up this item's "unseen change" dot. The dot shows when
   * any listed topic has a change the user hasn't looked at yet, and clears the moment
   * they open this section.
   */
  topics?: RealtimeTopic[];
}

/** LegalLink wordmark that collapses to just the mark in icon mode. */
function Brand() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  return (
    <Link href="/" aria-label="LegalLink home" className="flex items-center px-1 pb-1 pt-1.5">
      <Logo href={null} showText={!collapsed} markSize={collapsed ? 'size-9' : 'size-11'} textClassName="text-2xl" />
    </Link>
  );
}

/**
 * Sidebar navigation. On mobile the sidebar is a slide-over sheet, so selecting
 * an item also closes it — otherwise the user lands on the new page with the
 * sheet still covering it and has to dismiss it by hand.
 */
function ConsoleNav({ nav }: { nav: ConsoleNavItem[] }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { unseen, setActiveTopics } = useRealtimeContext();

  // Topics belonging to the section currently on screen — these stay un-badged while
  // the user is looking at them (and clear the instant they navigate in).
  const activeKey = React.useMemo(() => {
    const set = new Set<RealtimeTopic>();
    for (const item of nav) {
      const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
      if (active) item.topics?.forEach((tp) => set.add(tp));
    }
    return Array.from(set).join(',');
  }, [nav, pathname]);

  React.useEffect(() => {
    setActiveTopics(activeKey ? (activeKey.split(',') as RealtimeTopic[]) : []);
  }, [activeKey, setActiveTopics]);

  return (
    <SidebarMenu>
      {nav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        // A red dot when this section has an unseen change — never on the section the
        // user is already viewing.
        const showDot = !active && !!item.topics?.some((tp) => unseen[tp]);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={t(item.key)}>
              <Link href={item.href} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <Icon /><span>{t(item.key)}</span>
              </Link>
            </SidebarMenuButton>
            {showDot && (
              <span
                aria-hidden
                className="pointer-events-none absolute right-2 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-sidebar"
              />
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

/**
 * Shared console layout built on the shadcn sidebar: a full-height collapsible sidebar
 * (brand · nav · account) plus a SidebarInset whose slim header carries the trigger and
 * the theme/language toggles. Pages render as `children` inside the inset.
 */
export function ConsoleShell({
  nav, footer, brand, children,
}: {
  nav: ConsoleNavItem[];
  footer: React.ReactNode;
  /** Override the default LegalLink brand (e.g. the admin shield). */
  brand?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>{brand ?? <Brand />}</SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <ConsoleNav nav={nav} />
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>{footer}</SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* min-w-0: without it this flex child adopts the intrinsic width of wide
          content (e.g. the advocates filter row), growing past the viewport and
          dragging the sticky header — and its theme/avatar controls — off-screen
          on mobile. This keeps the inset (and header) clamped to the viewport so
          horizontal-scroll regions scroll instead of widening the page. */}
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
          {/* Left — sidebar trigger */}
          <div className="flex flex-1 items-center">
            <SidebarTrigger className="-ml-1" />
          </div>

          {/* Center — equal-width side sections keep this truly centered */}
          {role && (
            <span className="flex shrink-0 items-center gap-2 font-display text-base font-semibold tracking-tight sm:text-lg">
              {/* Full "LegalLink | role" on desktop; on mobile just the role
                  (the language switch lives in the avatar menu there). */}
              <span className="hidden items-center gap-2 sm:flex">
                LegalLink
                <span className="text-border">|</span>
              </span>
              <span className="capitalize text-info">{role}</span>
            </span>
          )}

          {/* Right — language (desktop) · theme · avatar */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <div className="mx-1 h-5 w-px bg-border" />
            <HeaderAccountMenu />
          </div>
        </header>
        {/* min-w-0: stop wide page content (e.g. a horizontal-scroll filter row)
            from forcing this column — and the sticky header above — wider than
            the viewport, which would push the header controls off-screen. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
