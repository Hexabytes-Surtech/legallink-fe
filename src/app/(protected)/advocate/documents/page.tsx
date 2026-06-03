'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdvocateDoc } from '@/types';

export default function AdvocateDocumentsPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<AdvocateDoc[]>(() => api.get('/advocate/documents'), []);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      await api.upload('/advocate/documents', fd);
      toast.success(t('adv.docs.uploaded'));
      q.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const docs = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.docs.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('adv.docs.hint')}</p>
        </div>
        <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={onPick} />
        <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <><Loader2 className="size-4 animate-spin" />…</> : <><Upload className="size-4" /> {t('adv.docs.upload')}</>}
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">{t('adv.docs.title')}</CardTitle></CardHeader>
        <CardContent>
          {q.loading && docs.length === 0 ? (
            <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : docs.length === 0 ? (
            <EmptyState icon={FileText} title={t('adv.docs.empty')} />
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3">
                  <span className="inline-flex items-center gap-2.5 text-sm">
                    <FileText className="size-5 text-gold" />
                    <span>
                      <span className="block font-medium uppercase">{d.file_type?.split('/').pop() || 'FILE'}</span>
                      <span className="block text-xs text-muted-foreground">
                        {new Date(d.uploaded_at).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                  </span>
                  {d.file_path && (
                    <a href={d.file_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                      {t('shared.view')} <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
