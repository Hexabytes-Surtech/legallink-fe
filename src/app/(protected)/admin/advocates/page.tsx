'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Check, X, FileText, ExternalLink, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import type { PendingAdvocate } from '@/types';
import type { TranslationKey } from '@/i18n/config';

type Tr = (k: TranslationKey) => string;

export default function AdminVerificationPage() {
  const { t } = useLanguage();
  const q = useQuery<PendingAdvocate[]>(() => api.get('/admin/advocates/pending'), []);
  const list = q.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adm.verify.title')}</h1>

      {q.loading && list.length === 0 ? (
        <div className="mt-8 space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="mt-8"><EmptyState icon={BadgeCheck} title={t('adm.verify.empty')} /></div>
      ) : (
        <div className="mt-8 space-y-5">
          {list.map((a) => <AdvocateReviewCard key={a.id} a={a} t={t} onChanged={q.refetch} />)}
        </div>
      )}
    </div>
  );
}

function AdvocateReviewCard({ a, t, onChanged }: { a: PendingAdvocate; t: Tr; onChanged: () => void }) {
  const approveM = useMutation(() => api.put(`/admin/advocates/${a.id}/verify`, { action: 'approve' }));

  async function approve() {
    try { await approveM.mutate(); toast.success(t('adm.verify.approved')); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : t('shared.error')); }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{a.name}</h2>
            <p className="text-sm text-muted-foreground">{a.bar_enrolment_number} · {a.state_bar}</p>
          </div>
          <Badge variant="warning">{t('adm.verify.submitted')}</Badge>
        </div>

        {/* Contact + details */}
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {(a.user_email || a.email) && <Info icon={<Mail className="size-4" />}>{a.user_email || a.email}</Info>}
          {a.phone && <Info icon={<Phone className="size-4" />}>{a.phone}</Info>}
          {a.address && <Info icon={<MapPin className="size-4" />}>{a.address}</Info>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {a.practice_areas?.map((p) => <Badge key={p} variant="gold">{p}</Badge>)}
          {a.districts?.map((d) => <Badge key={d} variant="muted">{d}</Badge>)}
        </div>

        {/* Documents */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('adm.verify.docs')}</p>
          {a.documents && a.documents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {a.documents.map((d) => (
                <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold/40">
                  <FileText className="size-4 text-gold" />
                  {d.fileType?.split('/').pop()?.toUpperCase() || 'FILE'}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('adm.verify.noDocs')}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button onClick={approve} disabled={approveM.loading}>
            {approveM.loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {t('adm.verify.approve')}
          </Button>
          <RejectDialog advocateId={a.id} t={t} onChanged={onChanged} />
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 text-muted-foreground">{icon}<span className="text-foreground/90">{children}</span></span>;
}

function RejectDialog({ advocateId, t, onChanged }: { advocateId: string; t: Tr; onChanged: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');
  const m = useMutation(() => api.put(`/admin/advocates/${advocateId}/verify`, { action: 'reject', reason: reason.trim() }));

  async function submit() {
    if (!reason.trim()) { setError(t('adm.verify.reasonRequired')); return; }
    try { await m.mutate(); toast.success(t('adm.verify.rejected')); setOpen(false); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : t('shared.error')); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setReason(''); setError(''); } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-destructive"><X className="size-4" /> {t('adm.verify.reject')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('adm.verify.rejectTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
            placeholder={t('adm.verify.reasonPlaceholder')}
            className="min-h-28"
            maxLength={500}
            aria-invalid={!!error}
          />
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <Button variant="destructive" disabled={m.loading} onClick={submit}>
          {m.loading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} {t('adm.verify.reject')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
