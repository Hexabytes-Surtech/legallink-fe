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
  // Honour ?returnTo=… set by access guards (e.g. /advocates) so the user lands
  // back where they came from. Only allow internal paths — never an open redirect.
  const raw = searchParams.get('returnTo');
  const returnTo = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : undefined;
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
    <Card className="glass-strong shadow-lift">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <React.Suspense fallback={<AuthOtpForm mode="login" />}>
          <LoginInner />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}
