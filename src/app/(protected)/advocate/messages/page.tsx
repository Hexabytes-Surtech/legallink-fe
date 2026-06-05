'use client';

import { MessagesSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvocateMessagesIndexPage() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
      <span className="grid size-14 place-items-center rounded-2xl bg-gold/10 text-gold">
        <MessagesSquare className="size-7" />
      </span>
      <p className="text-sm">{t('chat.select')}</p>
    </div>
  );
}
