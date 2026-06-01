'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, MessageSquare, Star, CalendarClock, XCircle, Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/empty-state';
import { FeedbackDialog } from '@/components/features/feedback-dialog';
import { BookingDialog } from '@/components/features/booking-dialog';
import type { MatterListItem, ConsultationListItem, ConsultationStatus } from '@/types';
import type { TranslationKey } from '@/i18n/config';

const STATUS_BADGE: Record<ConsultationStatus, { key: TranslationKey; variant: 'warning' | 'success' | 'destructive' | 'muted' }> = {
  pending: { key: 'matters.consult.pending', variant: 'warning' },
  accepted: { key: 'matters.consult.accepted', variant: 'success' },
  declined: { key: 'matters.consult.declined', variant: 'destructive' },
  closed: { key: 'matters.consult.closed', variant: 'muted' },
};

function formatIst(iso: string, isBn: boolean) {
  return new Date(iso).toLocaleString(isBn ? 'bn-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) + ' IST';
}

export default function MattersPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const mattersQ = useQuery<MatterListItem[] | { matters: MatterListItem[] }>(() => api.get('/matter'), []);
  const consultsQ = useQuery<ConsultationListItem[]>(() => api.get('/consultations'), []);

  const matters = React.useMemo(() => {
    const d = mattersQ.data;
    return Array.isArray(d) ? d : d?.matters ?? [];
  }, [mattersQ.data]);

  const consultByMatter = React.useMemo(() => {
    const map = new Map<string, ConsultationListItem>();
    (consultsQ.data ?? []).forEach((c) => map.set(c.matter_id, c));
    return map;
  }, [consultsQ.data]);

  const cancelM = useMutation((appointmentId: string) =>
    api.put(`/appointments/${appointmentId}`, { action: 'cancel' }),
  );

  async function cancelBooking(appointmentId: string) {
    if (!window.confirm(t('booking.cancelConfirm'))) return;
    try {
      await cancelM.mutate(appointmentId);
      toast.success(t('booking.cancelled'));
      consultsQ.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    }
  }

  const refresh = () => { mattersQ.refetch(); consultsQ.refetch(); };
  const loading = mattersQ.loading && matters.length === 0;

  const rows = matters.map((m) => ({ matter: m, consult: consultByMatter.get(m.matter_id) }));
  const active = rows.filter((r) => r.consult && (r.consult.status === 'pending' || r.consult.status === 'accepted'));
  const closed = rows.filter((r) => r.consult && (r.consult.status === 'closed' || r.consult.status === 'declined'));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('matters.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('matters.subtitle')}</p>
        </div>
        <Button asChild><Link href="/intake"><Plus className="size-4" /> {t('matters.empty.cta')}</Link></Button>
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={FileText}
            title={t('matters.empty')}
            action={<Button asChild><Link href="/intake">{t('matters.empty.cta')}</Link></Button>}
          />
        </div>
      ) : (
        <Tabs defaultValue="all" className="mt-8">
          <TabsList>
            <TabsTrigger value="all">{t('matters.tab.all')} ({rows.length})</TabsTrigger>
            <TabsTrigger value="active">{t('matters.tab.active')} ({active.length})</TabsTrigger>
            <TabsTrigger value="closed">{t('matters.tab.closed')} ({closed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><RowList rows={rows} isBn={isBn} t={t} onChanged={refresh} onCancel={cancelBooking} /></TabsContent>
          <TabsContent value="active"><RowList rows={active} isBn={isBn} t={t} onChanged={refresh} onCancel={cancelBooking} /></TabsContent>
          <TabsContent value="closed"><RowList rows={closed} isBn={isBn} t={t} onChanged={refresh} onCancel={cancelBooking} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

type Row = { matter: MatterListItem; consult?: ConsultationListItem };

function RowList({
  rows, isBn, t, onChanged, onCancel,
}: {
  rows: Row[];
  isBn: boolean;
  t: (k: TranslationKey) => string;
  onChanged: () => void;
  onCancel: (appointmentId: string) => void;
}) {
  const tr = t;
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{tr('matters.empty')}</p>;
  }
  return (
    <div className="space-y-4">
      {rows.map(({ matter, consult }) => {
        const badge = consult ? STATUS_BADGE[consult.status] : null;
        const scheduled = consult?.appointmentStatus === 'scheduled' && consult.appointmentId && consult.scheduledAt;
        return (
          <Card key={matter.matter_id}>
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {badge ? <Badge variant={badge.variant}>{tr(badge.key)}</Badge> : <Badge variant="muted">{tr('matters.consult.none')}</Badge>}
                  {!!consult?.unread && consult.unread > 0 && <Badge variant="default">{consult.unread} {tr('matters.unreadMsgs')}</Badge>}
                  {consult?.advocateName && <span className="text-xs text-muted-foreground">· {consult.advocateName}</span>}
                </div>
                <p className={`mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/90 ${matter.language === 'bn' ? 'font-bn' : ''}`}>
                  {matter.query}
                </p>
                {scheduled && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <CalendarClock className="size-3.5" /> {tr('matters.scheduledFor')}: {formatIst(consult!.scheduledAt!, isBn)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                <Button asChild variant="outline" size="sm"><Link href={`/matter/${matter.matter_id}`}><FileText className="size-4" /> {tr('matters.viewMatter')}</Link></Button>
                {consult?.status === 'accepted' && (
                  <Button asChild size="sm"><Link href={`/chat/${consult.consultationId}`}><MessageSquare className="size-4" /> {tr('matters.openChat')}</Link></Button>
                )}
                {consult?.status === 'closed' && (
                  <FeedbackDialog
                    consultationId={consult.consultationId}
                    onDone={onChanged}
                    trigger={<Button size="sm" variant="secondary"><Star className="size-4" /> {tr('matters.leaveFeedback')}</Button>}
                  />
                )}
                {scheduled && (
                  <>
                    <BookingDialog
                      appointmentId={consult!.appointmentId!}
                      advocateId={consult!.advocate_id}
                      onDone={onChanged}
                      trigger={<Button size="sm" variant="outline"><CalendarClock className="size-4" /> {tr('matters.reschedule')}</Button>}
                    />
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onCancel(consult!.appointmentId!)}>
                      <XCircle className="size-4" /> {tr('matters.cancelBooking')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
