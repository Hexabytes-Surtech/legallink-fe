'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AccountProfile } from '@/components/features/account-profile';
import { CallAlertsSettings } from '@/components/features/call/call-alerts-settings';

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('settings.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('settings.subtitle')}</p>
      <div className="mt-8 space-y-8">
        <AccountProfile />
        <CallAlertsSettings />
      </div>
    </div>
  );
}
