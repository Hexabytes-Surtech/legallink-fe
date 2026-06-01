'use client';

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvocateSignupPage() {
  const { t } = useLanguage();
  return (
    <Card className="glass-strong shadow-lift">
      <CardHeader className="text-center">
        <Badge variant="gold" className="mx-auto"><BadgeCheck /> Advocate</Badge>
        <CardTitle className="font-display text-2xl">{t('auth.advocate.title')}</CardTitle>
        <CardDescription>{t('auth.advocate.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AuthOtpForm mode="advocate-signup" redirectTo="/advocate/onboarding" />
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">{t('nav.login')}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
