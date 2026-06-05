'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AccountProfile } from '@/components/features/account-profile';

export default function CitizenProfilePage() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <div className="mt-5">
        <AccountProfile />
      </div>
    </div>
  );
}
