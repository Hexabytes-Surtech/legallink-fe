'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Inbox, MessagesSquare, CalendarClock, UserCog, FileText, Star, Rocket,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConsoleShell, type ConsoleNavItem } from '@/components/shared/console-shell';
import { SidebarAccount } from '@/components/shared/sidebar-account';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { Spinner } from '@/components/shared/spinner';
import type { AdvocateSelf } from '@/types';

const NAV: ConsoleNavItem[] = [
  { href: '/advocate/dashboard', icon: LayoutDashboard, key: 'adv.nav.dashboard', exact: true },
  { href: '/advocate/consultations', icon: Inbox, key: 'adv.nav.consultations' },
  { href: '/advocate/messages', icon: MessagesSquare, key: 'adv.nav.messages' },
  { href: '/advocate/availability', icon: CalendarClock, key: 'adv.nav.availability' },
  { href: '/advocate/reviews', icon: Star, key: 'adv.nav.reviews' },
  { href: '/advocate/profile', icon: UserCog, key: 'adv.nav.profile' },
  { href: '/advocate/documents', icon: FileText, key: 'adv.nav.documents' },
  { href: '/advocate/onboarding', icon: Rocket, key: 'adv.nav.onboarding' },
];

export default function AdvocateLayout({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const isAdvocate = user?.role === 'advocate';

  React.useEffect(() => {
    if (user && user.role !== 'advocate') router.replace('/dashboard');
  }, [user, router]);

  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), [pathname], { enabled: isAdvocate });
  const me = meQ.data;

  // Backfill name/avatar into AuthContext only when missing (never overwrite a fresh upload).
  React.useEffect(() => {
    if (!me) return;
    const patch: { name?: string; avatar_url?: string | null } = {};
    if (!user?.name && me.name) patch.name = me.name;
    if (!user?.avatar_url && me.avatar_url) patch.avatar_url = me.avatar_url;
    if (Object.keys(patch).length) updateUser(patch);
  }, [me, user?.name, user?.avatar_url, updateUser]);

  if (user && !isAdvocate) {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  const name = user?.name || me?.name || (user?.email?.split('@')[0] ?? 'Advocate');
  const avatarUrl = user?.avatar_url ?? me?.avatar_url ?? null;

  return (
    <ConsoleShell
      nav={NAV}
      footer={
        <SidebarAccount
          avatarUrl={avatarUrl}
          name={name}
          secondary={me ? <VerificationBadge status={me.verification_status} className="mt-0.5" /> : undefined}
          profileHref="/advocate/profile"
          profileLabel={t('adv.nav.profile')}
        />
      }
    >
      {children}
    </ConsoleShell>
  );
}
