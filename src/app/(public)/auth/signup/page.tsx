'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SignupPage() {
  const { t } = useLanguage();
  return (
    <Card className="glass-strong shadow-lift">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">{t('auth.signup.title')}</CardTitle>
        <CardDescription>{t('auth.signup.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthOtpForm mode="signup" />
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">{t('nav.login')}</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Are you an advocate?{' '}
          <Link href="/auth/advocate-signup" className="font-medium text-primary hover:underline">{t('nav.forAdvocates')}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
