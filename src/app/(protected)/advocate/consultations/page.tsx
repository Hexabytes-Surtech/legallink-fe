'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Inbox, Check, X, MessageSquare, Eye, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdvocateConsultation, ConsultationStatus } from '@/types';
import type { TranslationKey } from '@/i18n/config';

type Tr = (k: TranslationKey) => string;

const STATUS: Record<ConsultationStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' }> = {
  pending: { label: 'pending', variant: 'warning' },
  accepted: { label: 'accepted', variant: 'success' },
  declined: { label: 'declined', variant: 'destructive' },
  closed: { label: 'closed', variant: 'muted' },
};

export default function AdvocateConsultationsPage() {
  const { t } = useLanguage();
  const q = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), []);
  const list = q.data ?? [];

  const requests = list.filter((c) => c.status === 'pending');
  const active = list.filter((c) => c.status === 'accepted');
  const closed = list.filter((c) => c.status === 'closed' || c.status === 'declined');

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.consult.title')}</h1>

      {q.loading && list.length === 0 ? (
        <div className="mt-8 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : (
        <Tabs defaultValue="requests" className="mt-8">
          <TabsList>
            <TabsTrigger value="requests">{t('adv.consult.tab.requests')} ({requests.length})</TabsTrigger>
            <TabsTrigger value="active">{t('adv.consult.tab.active')} ({active.length})</TabsTrigger>
            <TabsTrigger value="closed">{t('adv.consult.tab.closed')} ({closed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="requests"><List items={requests} t={t} onChanged={q.refetch} /></TabsContent>
          <TabsContent value="active"><List items={active} t={t} onChanged={q.refetch} /></TabsContent>
          <TabsContent value="closed"><List items={closed} t={t} onChanged={q.refetch} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function List({
  items, t, onChanged,
}: {
  items: AdvocateConsultation[];
  t: Tr;
  onChanged: () => void;
}) {
  const tr = t;
  if (items.length === 0) return <EmptyState icon={Inbox} title={tr('adv.consult.empty')} />;
  return (
    <div className="space-y-4">
      {items.map((c) => <ConsultationCard key={c.id} c={c} tr={tr} onChanged={onChanged} />)}
    </div>
  );
}

function ConsultationCard({
  c, tr, onChanged,
}: {
  c: AdvocateConsultation;
  tr: Tr;
  onChanged: () => void;
}) {
  const st = STATUS[c.status];
  const acceptM = useMutation(() => api.put(`/advocate/consultations/${c.id}`, { action: 'accept' }));

  async function accept() {
    try { await acceptM.mutate(); toast.success('Accepted'); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : 'Failed'); }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={st.variant} className="capitalize">{c.status}</Badge>
          {c.classification?.matterType && <Badge variant="gold">{c.classification.matterType}</Badge>}
          <span className="text-xs text-muted-foreground">{tr('adv.consult.from')} {c.citizen_name || 'Citizen'}</span>
        </div>

        <p className={`line-clamp-2 text-sm leading-relaxed text-foreground/90 ${c.query_language === 'bn' ? 'font-bn' : ''}`}>{c.query_text}</p>

        {c.citizen_note && (
          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70">{tr('adv.consult.note')}: </span>{c.citizen_note}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm"><Link href={`/advocate/consultations/${c.id}`}><Eye className="size-4" /> {tr('adv.consult.viewDetail')}</Link></Button>
          {c.status === 'pending' && (
            <>
              <Button size="sm" onClick={accept} disabled={acceptM.loading}>
                {acceptM.loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {tr('adv.consult.accept')}
              </Button>
              <DeclineDialog consultationId={c.id} tr={tr} onChanged={onChanged} />
            </>
          )}
          {c.status === 'accepted' && (
            <Button asChild size="sm"><Link href={`/chat/${c.id}`}><MessageSquare className="size-4" /> {tr('adv.consult.openChat')}</Link></Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeclineDialog({ consultationId, tr, onChanged }: { consultationId: string; tr: Tr; onChanged: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const m = useMutation(() => api.put(`/advocate/consultations/${consultationId}`, { action: 'decline', declineReason: reason.trim() || undefined }));

  async function submit() {
    try { await m.mutate(); toast.success('Declined'); setOpen(false); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : 'Failed'); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive"><X className="size-4" /> {tr('adv.consult.decline')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{tr('adv.consult.decline')}</DialogTitle></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('adv.consult.declineReason')} className="min-h-24" maxLength={500} />
        <Button variant="destructive" disabled={m.loading} onClick={submit}>
          {m.loading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} {tr('adv.consult.decline')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
