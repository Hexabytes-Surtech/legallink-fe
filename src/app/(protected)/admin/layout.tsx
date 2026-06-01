'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/shared/spinner';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

const NAV: { href: string; icon: LucideIcon; key: TranslationKey }[] = [
  { href: '/admin', icon: LayoutDashboard, key: 'adm.nav.overview' },
  { href: '/admin/advocates', icon: BadgeCheck, key: 'adm.nav.verification' },
  { href: '/admin/messages', icon: ShieldAlert, key: 'adm.nav.moderation' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/matters');
  }, [user, router]);

  if (user && user.role !== 'admin') {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2.5 group-data-[state=collapsed]:justify-center">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-gold ring-1 ring-gold/30">
                <ShieldCheck className="size-5" />
              </span>
              <span className="font-display text-sm font-semibold group-data-[state=collapsed]:hidden">{t('adm.title')}</span>
            </span>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {NAV.map((item) => {
              const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={active} tooltip={t(item.key)}>
                    <Link href={item.href}><Icon /><span data-sb-hide>{t(item.key)}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <p className="truncate text-xs text-muted-foreground group-data-[state=collapsed]:hidden">{user?.email}</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="sticky top-16 z-10 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">{t('adm.title')}</span>
        </div>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
