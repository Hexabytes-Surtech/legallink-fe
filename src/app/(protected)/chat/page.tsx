'use client';

import { MessagesSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ChatIndexPage() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-gold/10 text-gold">
        <MessagesSquare className="size-8" />
      </span>
      <h2 className="font-display text-xl font-semibold">{t('chat.title')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t('chat.select')}</p>
    </div>
  );
}
