'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Flag, Check, X, Loader2, ShieldCheck, User } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useRealtime } from '@/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { CitizenReport } from '@/types';
import type { TranslationKey } from '@/i18n/config';

type Tr = (k: TranslationKey) => string;

export default function AdminReportsPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<CitizenReport[]>(() => api.get('/admin/reports'), []);
  // Live: a freshly filed report (or another admin resolving one) refreshes the queue.
  useRealtime(['admin-reports'], () => q.refetch());
  const list = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adm.reports.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adm.reports.subtitle')}</p>

      {q.loading && list.length === 0 ? (
        <div className="mt-8 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="mt-8"><EmptyState icon={ShieldCheck} title={t('adm.reports.empty')} /></div>
      ) : (
        <div className="mt-8 space-y-4">
          {list.map((r) => <ReportCard key={r.reportId} r={r} t={t} isBn={isBn} onChanged={q.refetch} />)}
        </div>
      )}
    </div>
  );
}

function ReportCard({ r, t, isBn, onChanged }: { r: CitizenReport; t: Tr; isBn: boolean; onChanged: () => void }) {
  const [note, setNote] = React.useState('');
  const reviewM = useMutation(() => api.put(`/admin/reports/${r.reportId}`, { action: 'review', note: note.trim() || undefined }));
  const dismissM = useMutation(() => api.put(`/admin/reports/${r.reportId}`, { action: 'dismiss', note: note.trim() || undefined }));
  const open = r.status === 'open';

  const statusVariant = { open: 'destructive', reviewed: 'success', dismissed: 'muted' } as const;

  async function act(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); toast.success(msg); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : t('shared.error')); }
  }

  return (
    <Card className={open ? 'border-destructive/30' : undefined}>
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="destructive"><Flag className="size-3.5" /> {t(`adm.reports.reason.${r.reason}` as TranslationKey)}</Badge>
          <Badge variant={statusVariant[r.status]}>{t(`adm.reports.status.${r.status}` as TranslationKey)}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(r.createdAt).toLocaleString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground/80">{t('adm.reports.reportedBy')}:</span> {r.advocateName}
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground/80">{t('adm.reports.citizen')}:</span>{' '}
            <span className="inline-flex items-center gap-1"><User className="size-3.5" />{r.citizenName}</span>
            {r.citizenEmail ? ` · ${r.citizenEmail}` : ''}
          </p>
        </div>

        {r.note && (
          <blockquote className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground/90">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adm.reports.note')}</span>
            “{r.note}”
          </blockquote>
        )}

        {r.matterSnippet && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide">{t('adm.reports.matter')}:</span> {r.matterSnippet}
          </p>
        )}

        {open ? (
          <div className="space-y-2 border-t border-border pt-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder={t('adm.reports.adminNotePlaceholder')}
              className="min-h-16"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => act(() => reviewM.mutate(), t('adm.reports.reviewed'))} disabled={reviewM.loading || dismissM.loading}>
                {reviewM.loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t('adm.reports.markReviewed')}
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => act(() => dismissM.mutate(), t('adm.reports.dismissed'))} disabled={reviewM.loading || dismissM.loading}>
                <X className="size-4" /> {t('adm.reports.dismiss')}
              </Button>
            </div>
          </div>
        ) : r.adminNote ? (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">{t('adm.reports.adminNote')}:</span> {r.adminNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
