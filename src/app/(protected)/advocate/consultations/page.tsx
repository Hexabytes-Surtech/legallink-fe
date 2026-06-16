'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Inbox, Check, X, MessageSquare, Eye, Loader2, Clock, CheckCircle2, XCircle, Archive, Flag,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery, useMutation } from '@/hooks/useApi';
import { useRealtime } from '@/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { displayPracticeArea } from '@/components/features/advocate-card';
import { AvatarFallback } from '@/components/ui/avatar';
import { ViewableAvatar } from '@/components/shared/viewable-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { AdvocateConsultation, ConsultationStatus } from '@/types';
import type { TranslationKey } from '@/i18n/config';
import type { LucideIcon } from 'lucide-react';

type Tr = (k: TranslationKey) => string;
type TabKey = 'requests' | 'active' | 'closed';

const STATUS: Record<
  ConsultationStatus,
  { variant: 'warning' | 'success' | 'destructive' | 'muted'; Icon: LucideIcon; accent: string; ring: string }
> = {
  pending: { variant: 'warning', Icon: Clock, accent: 'border-l-warning', ring: 'ring-warning/40' },
  accepted: { variant: 'success', Icon: CheckCircle2, accent: 'border-l-success', ring: 'ring-success/40' },
  declined: { variant: 'destructive', Icon: XCircle, accent: 'border-l-destructive', ring: 'ring-destructive/40' },
  closed: { variant: 'muted', Icon: Archive, accent: 'border-l-muted-foreground/40', ring: 'ring-border' },
};

function initials(name: string) {
  return (name || 'C').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

function timeAgo(iso: string | undefined, lang: string) {
  if (!iso) return '';
  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'bn' ? 'bn' : 'en', { numeric: 'auto' });
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(Math.round(diff), 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day');
    return rtf.format(Math.round(diff / 2592000), 'month');
  } catch {
    return '';
  }
}

export default function AdvocateConsultationsPage() {
  const { t } = useLanguage();
  const q = useQuery<AdvocateConsultation[]>(() => api.get('/advocate/consultations'), []);
  // Live: a new request (or a close on the other side) refreshes this list instantly.
  useRealtime(['consultations'], () => q.refetch());
  const list = q.data ?? [];

  const requests = list.filter((c) => c.status === 'pending');
  const active = list.filter((c) => c.status === 'accepted');
  const closed = list.filter((c) => c.status === 'closed' || c.status === 'declined');

  const [tab, setTab] = React.useState<TabKey>('requests');
  const shown = tab === 'requests' ? requests : tab === 'active' ? active : closed;

  const stats: { key: TabKey; label: string; count: number; Icon: LucideIcon; tone: string; activeCls: string }[] = [
    { key: 'requests', label: t('adv.consult.tab.requests'), count: requests.length, Icon: Inbox, tone: 'text-warning', activeCls: 'border-warning bg-warning/5' },
    { key: 'active', label: t('adv.consult.tab.active'), count: active.length, Icon: CheckCircle2, tone: 'text-success', activeCls: 'border-success bg-success/5' },
    { key: 'closed', label: t('adv.consult.tab.closed'), count: closed.length, Icon: Archive, tone: 'text-muted-foreground', activeCls: 'border-primary bg-primary/5' },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.consult.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adv.consult.subtitle')}</p>

      {q.loading && list.length === 0 ? (
        <div className="mt-8 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : (
        <>
          {/* Summary strip — doubles as the filter */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {stats.map((s) => {
              const isActive = tab === s.key;
              const Icon = s.Icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setTab(s.key)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all hover:shadow-soft',
                    isActive ? `${s.activeCls} shadow-soft` : 'border-border hover:border-foreground/20',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={cn('size-5', s.tone)} />
                    <span className="font-display text-2xl font-semibold tabular-nums">{s.count}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <List items={shown} t={t} onChanged={q.refetch} />
          </div>
        </>
      )}
    </div>
  );
}

function List({ items, t, onChanged }: { items: AdvocateConsultation[]; t: Tr; onChanged: () => void }) {
  if (items.length === 0) return <EmptyState icon={Inbox} title={t('adv.consult.empty')} />;
  return (
    <div className="space-y-4">
      {items.map((c) => <ConsultationCard key={c.id} c={c} tr={t} onChanged={onChanged} />)}
    </div>
  );
}

function ConsultationCard({ c, tr, onChanged }: { c: AdvocateConsultation; tr: Tr; onChanged: () => void }) {
  const { language } = useLanguage();
  const st = STATUS[c.status];
  const StatusIcon = st.Icon;
  const acceptM = useMutation(() => api.put(`/advocate/consultations/${c.id}`, { action: 'accept' }));
  const unread = c.unreadCount ?? 0;

  async function accept() {
    try { await acceptM.mutate(); toast.success('Accepted'); onChanged(); }
    catch (err) { toast.error(err instanceof ApiError ? err.first : 'Failed'); }
  }

  return (
    <Card className={cn('group overflow-hidden border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-lift', st.accent)}>
      <CardContent className="py-5">
        <div className="flex items-start gap-3.5">
          <ViewableAvatar
            src={c.citizen_avatar_url}
            name={c.citizen_name || 'Citizen'}
            className={cn('size-11 shrink-0 ring-2', st.ring)}
            fallback={<AvatarFallback className="text-sm font-semibold">{initials(c.citizen_name || 'Citizen')}</AvatarFallback>}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.citizen_name || 'Citizen'}</p>
                <p className="text-xs text-muted-foreground">{tr('adv.consult.requestedAgo')} {timeAgo(c.requested_at, language)}</p>
              </div>
              <Badge variant={st.variant} className="shrink-0 capitalize"><StatusIcon className="size-3.5" /> {c.status}</Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {c.classification?.matterType && <Badge variant="gold">{displayPracticeArea(c.classification.matterType)}</Badge>}
              {c.status === 'accepted' && unread > 0 && (
                <Badge variant="default" className="rounded-full">{unread} {tr('adv.consult.newMsgs')}</Badge>
              )}
              {c.reported && <Badge variant="destructive"><Flag className="size-3.5" /> reported</Badge>}
            </div>

            <p className={cn('mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/90', c.query_language === 'bn' && 'font-bn')}>{c.query_text}</p>

            {c.citizen_note && (
              <p className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/70">{tr('adv.consult.note')}: </span>{c.citizen_note}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
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
                <Button asChild size="sm"><Link href={`/advocate/messages/${c.id}`}><MessageSquare className="size-4" /> {tr('adv.consult.openChat')}</Link></Button>
              )}
            </div>
          </div>
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
