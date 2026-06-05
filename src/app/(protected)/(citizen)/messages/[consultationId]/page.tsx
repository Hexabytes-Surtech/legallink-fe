'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ChatRoom } from '@/components/features/chat-room';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MessagesThreadPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const { t } = useLanguage();
  // Mark-as-read + list refresh is handled centrally in the Messages layout.

  return (
    <div className="flex h-full flex-col">
      {/* Back to list — mobile only (desktop shows the list beside this) */}
      <Link
        href="/messages"
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
