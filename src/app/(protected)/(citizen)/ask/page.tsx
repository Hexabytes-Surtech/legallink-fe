'use client';

import * as React from 'react';
import { PanelLeft } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiChat } from '@/components/features/ai-chat';
import { AiChatHistory } from '@/components/features/ai-chat-history';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AiConversationSummary } from '@/types';

// The citizen console's AI assistant: a ChatGPT-style history rail (saved per
// account) alongside the multi-turn chat. The chat is "controlled" — the rail
// drives which conversation is shown; the chat reports back when a new one starts.
export default function AskAiPage() {
  const { t } = useLanguage();
  const listQ = useQuery<AiConversationSummary[]>(() => api.get('/ai/conversation'), []);
  const items = listQ.data ?? [];

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleCreated = React.useCallback((id: string) => {
    setSelectedId(id);
    listQ.refetch();
  }, [listQ]);

  const handleDelete = React.useCallback(async (id: string) => {
    await api.del(`/ai/conversation/${id}`);
    setSelectedId((cur) => (cur === id ? null : cur));
    listQ.refetch();
  }, [listQ]);

  const historyProps = {
    items,
    activeId: selectedId,
    loading: listQ.loading,
    onSelect: (id: string) => { setSelectedId(id); setSheetOpen(false); },
    onNew: () => { setSelectedId(null); setSheetOpen(false); },
    onDelete: handleDelete,
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      {/* Desktop history rail */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
        <AiChatHistory {...historyProps} />
      </aside>

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile history trigger */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm"><PanelLeft className="size-4" /> {t('ai.history.open')}</Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-80 flex-col gap-0 p-0">
              <SheetHeader className="border-b border-border px-4 py-3">
                <SheetTitle>{t('ai.history.title')}</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1">
                <AiChatHistory {...historyProps} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="min-h-0 flex-1">
          <AiChat
            className="h-full"
            controlled
            conversationId={selectedId}
            onConversationCreated={handleCreated}
            onNewChat={() => setSelectedId(null)}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
