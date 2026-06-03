'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConsoleShell, type ConsoleNavItem } from '@/components/shared/console-shell';
import { SidebarAccount } from '@/components/shared/sidebar-account';
import { Spinner } from '@/components/shared/spinner';

const NAV: ConsoleNavItem[] = [
  { href: '/admin', icon: LayoutDashboard, key: 'adm.nav.overview', exact: true },
  { href: '/admin/advocates', icon: BadgeCheck, key: 'adm.nav.verification' },
  { href: '/admin/messages', icon: ShieldAlert, key: 'adm.nav.moderation' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  React.useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  if (user && user.role !== 'admin') {
    return <div className="flex flex-1 items-center justify-center"><Spinner /></div>;
  }

  const name = user?.name || (user?.email?.split('@')[0] ?? 'Admin');

  return (
    <ConsoleShell
      nav={NAV}
      brand={
        <Link href="/admin" aria-label={t('adm.title')} className="flex items-center gap-2.5 px-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-gold ring-1 ring-gold/30">
            <ShieldCheck className="size-5" />
          </span>
          <span className="truncate font-display text-sm font-semibold group-data-[collapsible=icon]:hidden">{t('adm.title')}</span>
        </Link>
      }
      footer={
        <SidebarAccount
          avatarUrl={user?.avatar_url}
          name={name}
          secondary={<p className="truncate text-xs text-muted-foreground">{user?.email}</p>}
          profileHref="/settings"
          profileLabel={t('nav.account')}
        />
      }
    >
      {children}
    </ConsoleShell>
  );
}
