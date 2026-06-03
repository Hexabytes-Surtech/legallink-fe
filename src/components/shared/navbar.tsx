'use client';

import * as React from 'react';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings, Menu, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarViewer } from '@/contexts/AvatarViewerContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_HOME: Record<Role, string> = {
  citizen: '/dashboard',
  advocate: '/advocate/dashboard',
  admin: '/admin',
};

// Where the "Profile/Settings" dropdown entry points, per role. Each role's
// profile lives inside its own console; admin uses the generic settings page.
const ROLE_PROFILE: Record<Role, string> = {
  citizen: '/profile',
  advocate: '/advocate/profile',
  admin: '/settings',
};

const PUBLIC_LINKS = [
  { href: '/advocates', label: 'Find Advocates' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/auth/advocate-signup', label: 'For Advocates' },
];

function initials(name?: string | null, email?: string) {
  const base = name?.trim() || email?.split('@')[0] || 'U';
  return base.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { open: openAvatarViewer } = useAvatarViewer();
  const { t } = useLanguage();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const home = user ? ROLE_HOME[user.role] : '/';
  const profileHref = user ? ROLE_PROFILE[user.role] : '/settings';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all',
        scrolled ? 'glass-strong border-b border-border shadow-soft' : 'border-b border-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {!isAuthenticated &&
            PUBLIC_LINKS.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm">
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          {isAuthenticated && (
            <Button asChild variant="ghost" size="sm">
              <Link href={home}>Dashboard</Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle className="hidden sm:inline-flex" />
          <ThemeToggle />

          {/* Auth area */}
          {isLoading ? (
            <Skeleton className="size-10 rounded-full" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${initials(user.name, user.email)} — Account menu`}>
                  <Avatar className="ring-1 ring-border">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                    <AvatarFallback aria-hidden="true">{initials(user.name, user.email)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="normal-case">
                  <span className="block truncate text-sm font-semibold text-foreground">{user.name || user.email}</span>
                  <span className="block truncate text-xs font-normal capitalize text-muted-foreground">{user.role}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.avatar_url && (
                  <DropdownMenuItem onClick={() => openAvatarViewer(user.avatar_url as string, user.name || user.email)}>
                    <ImageIcon /> {t('avatar.view')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={home}><LayoutDashboard /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={profileHref}><Settings /> {user.role === 'citizen' ? 'Profile' : 'Settings'}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">Get started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle><Logo href={null} /></SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex flex-col gap-1">
                {(isAuthenticated ? [{ href: home, label: 'Dashboard' }] : PUBLIC_LINKS).map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <LanguageToggle />
                {!isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button asChild variant="outline"><Link href="/auth/login">Log in</Link></Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild><Link href="/auth/signup">Get started</Link></Button>
                    </SheetClose>
                  </div>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button asChild variant="outline"><Link href={profileHref}><Settings /> {user?.role === 'citizen' ? 'Profile' : 'Settings'}</Link></Button>
                    </SheetClose>
                    <Button variant="ghost" className="text-destructive" onClick={() => logout()}>
                      <LogOut /> Sign out
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
