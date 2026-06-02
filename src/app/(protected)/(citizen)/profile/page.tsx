'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AccountProfile } from '@/components/features/account-profile';

export default function CitizenProfilePage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('profile.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('profile.subtitle')}</p>
      <div className="mt-8">
        <AccountProfile />
      </div>
    </div>
  );
}
