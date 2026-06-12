'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ChatRoom } from '@/components/features/chat-room';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvocateMessagesThreadPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/advocate/messages"
        className="flex items-center gap-1.5 border-b border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground md:hidden"
      >
        <ArrowLeft className="size-4" /> {t('chat.conversations')}
      </Link>
      <div className="min-h-0 flex-1">
        <ChatRoom consultationId={consultationId} />
      </div>
    </div>
  );
}
