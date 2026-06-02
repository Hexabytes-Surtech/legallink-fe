'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, MessagesSquare, Scale, UserRound, Plus, Loader2, Pencil } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/spinner';
import type { UserProfile } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

const NAV: { href: string; icon: LucideIcon; key: TranslationKey }[] = [
  { href: '/profile', icon: UserRound, key: 'citizen.nav.profile' },
  { href: '/dashboard', icon: LayoutDashboard, key: 'citizen.nav.dashboard' },
  { href: '/matters', icon: FolderOpen, key: 'citizen.nav.matters' },
  { href: '/chat', icon: MessagesSquare, key: 'citizen.nav.messages' },
  { href: '/advocates', icon: Scale, key: 'citizen.nav.advocates' },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isCitizen = user?.role === 'citizen';

  // Role guard (parent layout already guarantees authentication).
  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'advocate') router.replace('/advocate/dashboard');
    else if (user.role === 'admin') router.replace('/admin');
  }, [user, router]);

  const meQ = useQuery<UserProfile>(() => api.get('/user/me'), [], { enabled: isCitizen });
  const me = meQ.data;
  const { uploading, openPicker, inputRef, onChange } = useAvatarUpload();

  if (user && !isCitizen) {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  const name = me?.name || user?.name || (user?.email?.split('@')[0] ?? 'You');
  const avatarUrl = me?.avatar_url ?? user?.avatar_url ?? null;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2 group-data-[state=collapsed]:justify-center">
            <div className="flex min-w-0 items-center gap-2.5 group-data-[state=collapsed]:hidden">
              <div className="relative shrink-0">
                <Avatar className="size-10 ring-1 ring-gold/30">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />
                <button
                  type="button"
                  onClick={openPicker}
                  disabled={uploading}
                  aria-label={t('settings.avatar')}
                  className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-border bg-background text-foreground shadow-soft transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-3 animate-spin" /> : <Pencil className="size-2.5" />}
                </button>
              </div>
              <div className="min-w-0 group-data-[state=collapsed]:hidden">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {NAV.map((item) => {
              const active = item.href === '/dashboard'
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
          <Button asChild className="w-full group-data-[state=collapsed]:px-0">
            <Link href="/intake" aria-label={t('citizen.nav.ask')}>
              <Plus className="size-4" />
              <span data-sb-hide>{t('citizen.nav.ask')}</span>
            </Link>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Mobile open-sidebar bar */}
        <div className="sticky top-16 z-10 flex items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">{t('citizen.nav.dashboard')}</span>
        </div>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
