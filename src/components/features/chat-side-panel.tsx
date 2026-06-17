'use client';

import * as React from 'react';
import { Clock, FileText, Vault } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConsultationTimeline } from '@/components/features/consultation-timeline';
import {
  ConsultationMatter,
  ConsultationDocuments,
  type PanelFile,
} from '@/components/features/consultation-matter';

/**
 * The chat's right-side panel: three tabs — the associated Matter (AI brief), the
 * Document Vault (matter documents + files shared in chat), and the Case timeline.
 * Used in both the desktop side panel and the mobile slide-over. `open` reflects whether
 * the panel is actually on screen, so a tab can skip network work while it's hidden.
 */
export function ChatSidePanel({
  consultationId,
  isAdvocate,
  matterId,
  chatAttachments = [],
  timelineVersion = 0,
  open = true,
}: {
  consultationId: string;
  isAdvocate: boolean;
  matterId?: string | null;
  chatAttachments?: PanelFile[];
  timelineVersion?: number;
  open?: boolean;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = React.useState('matter');

  const triggerCls = 'min-w-0 gap-1.5 px-2 text-xs';

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="sticky top-0 z-10 grid w-full grid-cols-3 bg-background/95 backdrop-blur">
        <TabsTrigger value="matter" className={triggerCls}>
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{t('chat.panel.matter')}</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className={triggerCls}>
          <Vault className="size-3.5 shrink-0" />
          <span className="truncate">{t('chat.panel.vault')}</span>
        </TabsTrigger>
        <TabsTrigger value="timeline" className={triggerCls}>
          <Clock className="size-3.5 shrink-0" />
          <span className="truncate">{t('chat.panel.timeline')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="matter">
        <ConsultationMatter
          consultationId={consultationId}
          isAdvocate={isAdvocate}
          matterId={matterId}
          active={open && tab === 'matter'}
        />
      </TabsContent>

      <TabsContent value="documents">
        <ConsultationDocuments
          consultationId={consultationId}
          isAdvocate={isAdvocate}
          chatAttachments={chatAttachments}
          active={open && tab === 'documents'}
        />
      </TabsContent>

      <TabsContent value="timeline">
        <ConsultationTimeline
          consultationId={consultationId}
          isAdvocate={isAdvocate}
          version={timelineVersion}
          embedded
        />
      </TabsContent>
    </Tabs>
  );
}
