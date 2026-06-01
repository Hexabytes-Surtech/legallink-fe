'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Inbox, CalendarClock, UserCog, FileText, Star, Rocket,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { Spinner } from '@/components/shared/spinner';
import type { AdvocateSelf } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

const NAV: { href: string; icon: LucideIcon; key: TranslationKey }[] = [
  { href: '/advocate/dashboard', icon: LayoutDashboard, key: 'adv.nav.dashboard' },
  { href: '/advocate/consultations', icon: Inbox, key: 'adv.nav.consultations' },
  { href: '/advocate/availability', icon: CalendarClock, key: 'adv.nav.availability' },
  { href: '/advocate/reviews', icon: Star, key: 'adv.nav.reviews' },
  { href: '/advocate/profile', icon: UserCog, key: 'adv.nav.profile' },
  { href: '/advocate/documents', icon: FileText, key: 'adv.nav.documents' },
  { href: '/advocate/onboarding', icon: Rocket, key: 'adv.nav.onboarding' },
];

export default function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // Role guard (parent layout already guarantees authentication).
  React.useEffect(() => {
    if (user && user.role !== 'advocate') router.replace('/matters');
  }, [user, router]);

  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), [], { enabled: user?.role === 'advocate' });
  const me = meQ.data;

  if (user && user.role !== 'advocate') {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  const name = me?.name || user?.name || (user?.email?.split('@')[0] ?? 'Advocate');
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5 group-data-[state=collapsed]:justify-center">
              <Avatar className="size-9 ring-1 ring-gold/30">
                {me?.avatar_url && <AvatarImage src={me.avatar_url} alt="" />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 group-data-[state=collapsed]:hidden">
                <p className="truncate text-sm font-semibold">{name}</p>
                {me && <VerificationBadge status={me.verification_status} className="mt-0.5" />}
              </div>
            </div>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {NAV.map((item) => {
              const active = item.href === '/advocate/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href);
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
        {/* Mobile open-sidebar bar */}
        <div className="sticky top-16 z-10 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">{t('nav.dashboard')}</span>
        </div>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
