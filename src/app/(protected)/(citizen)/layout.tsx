'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, FolderOpen, MessagesSquare, Scale, UserRound, Sparkles } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConsoleShell, type ConsoleNavItem } from '@/components/shared/console-shell';
import { SidebarAccount } from '@/components/shared/sidebar-account';
import { Spinner } from '@/components/shared/spinner';
import type { UserProfile } from '@/types';

const NAV: ConsoleNavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'citizen.nav.dashboard', exact: true },
  { href: '/ask', icon: Sparkles, key: 'citizen.nav.askAi' },
  { href: '/matters', icon: FolderOpen, key: 'citizen.nav.matters' },
  { href: '/messages', icon: MessagesSquare, key: 'citizen.nav.messages' },
  { href: '/advocates', icon: Scale, key: 'citizen.nav.advocates' },
  { href: '/profile', icon: UserRound, key: 'citizen.nav.profile' },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
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

  // Re-fetch on navigation so the account block stays current.
  const meQ = useQuery<UserProfile>(() => api.get('/user/me'), [pathname], { enabled: isCitizen });
  const me = meQ.data;

  // Backfill name/avatar into AuthContext only when missing (never overwrite a fresh upload).
  React.useEffect(() => {
    if (!me) return;
    const patch: { name?: string; avatar_url?: string | null } = {};
    if (!user?.name && me.name) patch.name = me.name;
    if (!user?.avatar_url && me.avatar_url) patch.avatar_url = me.avatar_url;
    if (Object.keys(patch).length) updateUser(patch);
  }, [me, user?.name, user?.avatar_url, updateUser]);

  if (user && !isCitizen) {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  const name = user?.name || me?.name || (user?.email?.split('@')[0] ?? 'You');
  const avatarUrl = user?.avatar_url ?? me?.avatar_url ?? null;

  return (
    <ConsoleShell
      nav={NAV}
      footer={
        <SidebarAccount
          avatarUrl={avatarUrl}
          name={name}
          secondary={<p className="truncate text-xs text-muted-foreground">{user?.email}</p>}
          profileHref="/profile"
          profileLabel={t('citizen.nav.profile')}
        />
      }
    >
      {children}
    </ConsoleShell>
  );
}
