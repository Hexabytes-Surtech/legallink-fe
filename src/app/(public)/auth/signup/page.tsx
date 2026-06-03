'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';

function SignupInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  // After signup we default to the user's own dashboard. We only RESUME a specific
  // matter (returnTo=/matter/…) so new users finishing the anonymous-intake funnel land
  // back on their matter; other targets drop to the dashboard.
  const raw = searchParams.get('returnTo');
  const returnTo = raw && raw.startsWith('/matter/') ? raw : undefined;
  const loginHref = returnTo ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}` : '/auth/login';

  return (
    <>
      <AuthOtpForm mode="signup" redirectTo={returnTo} />
      <p className="text-center text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">{t('nav.login')}</Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  const { t } = useLanguage();
  return (
    <Card className="glass-strong shadow-lift">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">{t('auth.signup.title')}</CardTitle>
        <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <React.Suspense fallback={<AuthOtpForm mode="signup" />}>
          <SignupInner />
        </React.Suspense>
        <p className="text-center text-xs text-muted-foreground">
          Are you an advocate?{' '}
          <Link href="/auth/advocate-signup" className="font-medium text-primary hover:underline">{t('nav.forAdvocates')}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
