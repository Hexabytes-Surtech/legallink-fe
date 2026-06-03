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
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

export interface ConsoleNavItem {
  href: string;
  icon: LucideIcon;
  key: TranslationKey;
  /** Active only on an exact path match (e.g. dashboard roots). Default: prefix match. */
  exact?: boolean;
}

/** LegalLink wordmark that collapses to just the mark in icon mode. */
function Brand() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  return (
    <Link href="/" aria-label="LegalLink home" className="flex h-9 items-center px-1">
      <Logo href={null} showText={!collapsed} />
    </Link>
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
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>{brand ?? <Brand />}</SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {nav.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={t(item.key)}>
                      <Link href={item.href}><Icon /><span>{t(item.key)}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>{footer}</SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle />
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
