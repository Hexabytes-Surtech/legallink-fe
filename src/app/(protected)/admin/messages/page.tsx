'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Check, X, Loader2, MessageSquareWarning } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { FlaggedMessage } from '@/types';
import type { TranslationKey } from '@/i18n/config';

type Tr = (k: TranslationKey) => string;
const prettyFlag = (f: string) => f.replace(/_/g, ' ');

export default function AdminModerationPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<FlaggedMessage[]>(() => api.get('/admin/messages/flagged'), []);
  const list = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adm.mod.title')}</h1>

      {q.loading && list.length === 0 ? (
        <div className="mt-8 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="mt-8"><EmptyState icon={ShieldCheck} title={t('adm.mod.empty')} /></div>
      ) : (
        <div className="mt-8 space-y-4">
          {list.map((m) => <FlaggedCard key={m.messageId} m={m} t={t} isBn={isBn} onChanged={q.refetch} />)}
        </div>
      )}
    </div>
  );
}

function FlaggedCard({ m, t, isBn, onChanged }: { m: FlaggedMessage; t: Tr; isBn: boolean; onChanged: () => void }) {
  const approveM = useMutation(() => api.put(`/admin/messages/${m.messageId}`, { action: 'approve' }));
  const dismissM = useMutation(() => api.put(`/admin/messages/${m.messageId}`, { action: 'dismiss' }));

  async function act(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); toast.success(msg); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : t('shared.error')); }
  }

  return (
    <Card className="border-warning/30">
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning" className="capitalize"><MessageSquareWarning className="size-3.5" /> {m.senderType}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(m.createdAt).toLocaleString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <blockquote className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground/90">
          “{m.content}”
        </blockquote>

        {m.moderationFlags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adm.mod.flags')}:</span>
            {m.moderationFlags.map((f) => <Badge key={f} variant="destructive" className="capitalize">{prettyFlag(f)}</Badge>)}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button onClick={() => act(() => approveM.mutate(), t('adm.mod.approved'))} disabled={approveM.loading}>
            {approveM.loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t('adm.mod.approve')}
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={() => act(() => dismissM.mutate(), t('adm.mod.dismissed'))} disabled={dismissM.loading}>
            <X className="size-4" /> {t('adm.mod.dismiss')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
