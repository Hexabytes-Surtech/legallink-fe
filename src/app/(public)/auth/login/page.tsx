'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const { t } = useLanguage();
  return (
    <Card className="glass-strong shadow-lift">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl">{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthOtpForm mode="login" />
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.needAccount')}{' '}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">{t('nav.getStarted')}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
