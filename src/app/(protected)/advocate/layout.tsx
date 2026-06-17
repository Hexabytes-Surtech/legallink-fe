'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Inbox, MessagesSquare, CalendarClock, UserCog, Star, Rocket,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useRealtime } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConsoleShell, type ConsoleNavItem } from '@/components/shared/console-shell';
import { SidebarAccount } from '@/components/shared/sidebar-account';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { AppSkeleton } from '@/components/shared/app-skeleton';
import type { AdvocateSelf } from '@/types';

const NAV: ConsoleNavItem[] = [
  { href: '/advocate/dashboard', icon: LayoutDashboard, key: 'adv.nav.dashboard', exact: true },
  { href: '/advocate/consultations', icon: Inbox, key: 'adv.nav.consultations', topics: ['consultations'] },
  { href: '/advocate/messages', icon: MessagesSquare, key: 'adv.nav.messages', topics: ['messages'] },
  { href: '/advocate/availability', icon: CalendarClock, key: 'adv.nav.availability' },
  { href: '/advocate/reviews', icon: Star, key: 'adv.nav.reviews' },
  { href: '/advocate/profile', icon: UserCog, key: 'adv.nav.profile' },
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
  // Live: an admin verifying/rejecting flips the verification banner/badge instantly.
  useRealtime(['verification'], () => meQ.refetch());
  const me = meQ.data;
  const onOnboarding = pathname === '/advocate/onboarding';

  // A first-time advocate (registered, never filled details) has verification_status
  // 'pending' and an incomplete profile → must finish onboarding first. Once the
  // profile is 100% complete OR they've submitted (status past 'pending'), they go
  // straight to the dashboard and onboarding is no longer forced.
  const profileComplete =
    !!me &&
    [
      me.bar_enrolment_number, me.state_bar, me.name, me.address,
      me.practice_areas?.length, me.courts?.length, me.languages?.length, me.districts?.length,
    ].every(Boolean);
  const needsOnboarding = !!me && me.verification_status === 'pending' && !profileComplete;

  React.useEffect(() => {
    if (needsOnboarding && !onOnboarding) router.replace('/advocate/onboarding');
  }, [needsOnboarding, onOnboarding, router]);

  // Backfill name/avatar into AuthContext only when missing (never overwrite a fresh upload).
  React.useEffect(() => {
    if (!me) return;
    const patch: { name?: string; avatar_url?: string | null } = {};
    if (!user?.name && me.name) patch.name = me.name;
    if (!user?.avatar_url && me.avatar_url) patch.avatar_url = me.avatar_url;
    if (Object.keys(patch).length) updateUser(patch);
  }, [me, user?.name, user?.avatar_url, updateUser]);

  if (user && !isAdvocate) {
    return <AppSkeleton />;
  }

  // Hold the UI while we resolve the profile (first load) or while a redirect to
  // onboarding is in flight — avoids flashing the dashboard before the redirect.
  if (isAdvocate && ((meQ.loading && !me) || (needsOnboarding && !onOnboarding))) {
    return <AppSkeleton />;
  }

  const name = user?.name || me?.name || (user?.email?.split('@')[0] ?? 'Advocate');
  const avatarUrl = user?.avatar_url ?? me?.avatar_url ?? null;

  // Onboarding is a first-time step — hide its nav entry once the advocate is past
  // 'pending' (established advocates update details via Profile instead).
  const nav = NAV.filter(
    (item) => item.href !== '/advocate/onboarding' || me?.verification_status === 'pending',
  );

  return (
    <ConsoleShell
      nav={nav}
      footer={
        <SidebarAccount
          avatarUrl={avatarUrl}
          name={name}
          nameAdornment={me ? <VerificationBadge status={me.verification_status} iconOnly /> : undefined}
          profileHref="/advocate/profile"
          profileLabel={t('adv.nav.profile')}
        />
      }
    >
      {children}
    </ConsoleShell>
  );
}
