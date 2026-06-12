'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';

function LoginInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  // After login we default to the user's own dashboard (their home). We only RESUME a
  // specific matter they were viewing (returnTo=/matter/…) — other targets like
  // /advocates intentionally drop to the dashboard so users land on their home first.
  const raw = searchParams.get('returnTo');
  const returnTo = raw && raw.startsWith('/matter/') ? raw : undefined;
  const signupHref = returnTo ? `/auth/signup?returnTo=${encodeURIComponent(returnTo)}` : '/auth/signup';

  return (
    <>
      <AuthOtpForm mode="login" redirectTo={returnTo} />
      <p className="text-center text-sm text-muted-foreground">
        {t('auth.needAccount')}{' '}
        <Link href={signupHref} className="font-semibold text-primary hover:underline">{t('nav.getStarted')}</Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Card className="relative overflow-hidden glass-strong shadow-lift duration-500 animate-in fade-in zoom-in-95">
      {/* Animated gradient hairline along the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px animate-border-rotate"
        style={{ background: 'conic-gradient(from var(--ll-angle), transparent, var(--gold), var(--gold-bright), transparent)' }}
      />
      {/* Soft brand bloom behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 size-40 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--glow), transparent 70%)' }}
      />
      <CardHeader className="relative text-center">
        <CardTitle className="font-display text-2xl">{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <React.Suspense fallback={<AuthOtpForm mode="login" />}>
          <LoginInner />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}
