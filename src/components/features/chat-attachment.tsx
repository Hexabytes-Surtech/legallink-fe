'use client';

import * as React from 'react';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { WsMessage } from '@/types';

function humanSize(bytes?: number) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Renders one chat attachment (image or PDF). Citizens (owners) get a delete control;
 * advocates get a view-only experience at full quality with download deterrents
 * (no download button, right-click/drag disabled, PDF toolbar hidden). True download
 * blocking is impossible — these are best-effort deterrents.
 */
export function ChatAttachment({
  msg, mine, canDelete, protect, deleting, onDelete,
}: {
  msg: WsMessage;
  mine: boolean;
  canDelete: boolean;
  protect: boolean;
  deleting?: boolean;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  if (msg.deleted) {
    return (
      <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[78%] rounded-2xl border border-dashed border-border px-3.5 py-2 text-sm italic text-muted-foreground">
          {t('chat.attachment.removed')}
        </div>
      </div>
    );
  }

  const url = msg.attachmentUrl ?? '';
  const isImage = msg.attachmentType === 'image';
  const guard = protect ? { onContextMenu: (e: React.MouseEvent) => e.preventDefault(), draggable: false } : {};

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('group relative max-w-[78%] overflow-hidden rounded-2xl border border-border shadow-soft',
        mine ? 'rounded-br-sm' : 'rounded-bl-sm')}>
        {isImage ? (
          <button type="button" onClick={() => setOpen(true)} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={msg.attachmentName ?? ''}
              className={cn('max-h-64 w-full cursor-zoom-in object-cover', protect && 'select-none')}
              {...guard}
            />
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2.5 bg-card px-3.5 py-3 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block max-w-[14rem] truncate text-sm font-medium">{msg.attachmentName ?? 'document.pdf'}</span>
              <span className="block text-xs text-muted-foreground">PDF · {humanSize(msg.attachmentSize)}</span>
            </span>
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label={t('chat.attachment.delete')}
            className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-background/80 text-foreground opacity-0 shadow-soft backdrop-blur transition-opacity hover:bg-background hover:text-destructive group-hover:opacity-100 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        )}
      </div>

      {/* Full-quality viewer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(isImage ? 'max-w-3xl border-0 bg-transparent p-0 shadow-none' : 'max-w-3xl p-3')}>
          <DialogTitle className="sr-only">{msg.attachmentName ?? t('chat.attachment.view')}</DialogTitle>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={msg.attachmentName ?? ''}
              className={cn('max-h-[85vh] w-full rounded-xl object-contain', protect && 'select-none')}
              {...guard}
            />
          ) : (
            <iframe
              src={`${url}#toolbar=${protect ? 0 : 1}&navpanes=0`}
              title={msg.attachmentName ?? 'PDF'}
              className="h-[80vh] w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
