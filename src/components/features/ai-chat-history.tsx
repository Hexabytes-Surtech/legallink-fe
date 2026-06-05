'use client';

import * as React from 'react';
import { Plus, Trash2, MessageSquareText, Loader2, Scale } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { AiConversationSummary } from '@/types';
import { cn } from '@/lib/utils';

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

/**
 * The chat-history rail for the citizen console. Lists past AI conversations
 * (titled by the first message), lets you switch between them, start a new one,
 * and delete (with confirmation). Layout-agnostic — fills its parent (a desktop
 * column or a mobile drawer).
 */
export function AiChatHistory({
  items,
  activeId,
  loading,
  onSelect,
  onNew,
  onDelete,
}: {
  items: AiConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState<AiConversationSummary | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      await onDelete(pending.conversationId);
      setPending(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* New chat */}
      <div className="p-3">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" /> {t('ai.history.new')}
        </Button>
      </div>

      <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('ai.history.title')}
      </p>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-gold" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquareText className="mx-auto size-6 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-foreground/80">{t('ai.history.empty')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('ai.history.emptyHint')}</p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((c) => {
              const active = c.conversationId === activeId;
              return (
                <li key={c.conversationId} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.conversationId)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 pr-8 text-left transition-colors',
                      active
                        ? 'border-gold/40 bg-accent'
                        : 'border-transparent hover:bg-accent/60',
                    )}
                  >
                    <span className={cn('grid size-6 shrink-0 place-items-center rounded-md', active ? 'bg-gold/15 text-gold' : 'bg-muted text-muted-foreground')}>
                      {c.matterId ? <Scale className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground/90">{c.title}</span>
                      <span className="block text-[11px] text-muted-foreground">{relTime(c.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('ai.history.delete')}
                    onClick={() => setPending(c)}
                    className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ai.history.delete.title')}</DialogTitle>
            <DialogDescription>{t('ai.history.delete.body')}</DialogDescription>
          </DialogHeader>
          {pending && (
            <p className="truncate rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground/80">
              “{pending.title}”
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={deleting}>
              {t('ai.history.delete.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {t('ai.history.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
