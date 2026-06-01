'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Languages as LangIcon, Building2, MessageSquareQuote, CalendarClock } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { RatingStars } from '@/components/features/rating-stars';
import { ConnectDialog } from '@/components/features/connect-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import type { AdvocateCardData, AdvocateFeedback, AvailabilityDay } from '@/types';

type Profile = AdvocateCardData & { courts?: string[] };

function initials(name: string) {
  return name?.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'A';
}

export default function AdvocateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const profileQ = useQuery<Profile>(() => api.get(`/advocates/${id}`, { skipAuth: true }), [id]);
  const feedbackQ = useQuery<AdvocateFeedback>(() => api.get(`/advocates/${id}/feedback`, { skipAuth: true }), [id]);
  const availQ = useQuery<AvailabilityDay[]>(() => api.get(`/advocates/${id}/availability`, { skipAuth: true }), [id]);

  const [lastMatterId, setLastMatterId] = React.useState<string | null>(null);
  React.useEffect(() => { setLastMatterId(localStorage.getItem('ll_last_matter_id')); }, []);

  const p = profileQ.data;
  const availableDays = (availQ.data ?? []).filter((d) => d.slots.some((s) => s.available)).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/advocates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t('nav.findAdvocates')}
      </Link>

      {profileQ.loading && !p ? (
        <ProfileSkeleton />
      ) : profileQ.error && !p ? (
        <div className="mt-6"><EmptyState icon={MessageSquareQuote} title={t('shared.error')} /></div>
      ) : p ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Header */}
            <Card>
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
                <Avatar className="size-20 ring-1 ring-border">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
                  <AvatarFallback className="text-xl">{initials(p.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-semibold tracking-tight">{p.name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <VerificationBadge status={p.verification_status} />
                    <RatingStars rating={p.rating} count={p.rating_count} size="md" />
                  </div>
                  {p.state_bar && <p className="mt-2 text-sm text-muted-foreground">{p.state_bar}</p>}
                </div>
              </CardContent>
            </Card>

            {/* About */}
            {p.bio && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t('advocates.about')}</CardTitle></CardHeader>
                <CardContent><p className="text-sm leading-relaxed text-foreground/90">{p.bio}</p></CardContent>
              </Card>
            )}

            {/* Practice details */}
            <Card>
              <CardContent className="space-y-4 py-6">
                <DetailRow label={t('matter.practiceAreas')}>
                  {p.practice_areas?.map((a) => <Badge key={a} variant="gold">{a}</Badge>)}
                </DetailRow>
                <Separator />
                <DetailRow label={t('matter.languages')} icon={<LangIcon className="size-4" />}>
                  {p.languages?.map((l) => <Badge key={l} variant="muted">{l === 'bn' ? 'বাংলা' : l === 'en' ? 'English' : l}</Badge>)}
                </DetailRow>
                <Separator />
                <DetailRow label={t('matter.districts')} icon={<MapPin className="size-4" />}>
                  {p.districts?.map((d) => <Badge key={d} variant="muted">{d}</Badge>)}
                </DetailRow>
                {p.courts && p.courts.length > 0 && (
                  <>
                    <Separator />
                    <DetailRow label="Courts" icon={<Building2 className="size-4" />}>
                      {p.courts.map((c) => <Badge key={c} variant="muted">{c}</Badge>)}
                    </DetailRow>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquareQuote className="size-4 text-gold" /> {isBn ? 'রিভিউ' : 'Reviews'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedbackQ.loading ? (
                  <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>
                ) : feedbackQ.data && feedbackQ.data.reviews.length > 0 ? (
                  feedbackQ.data.reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{r.citizenName}</span>
                        <RatingStars rating={r.rating} />
                      </div>
                      {r.comment && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.comment}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('common.noReviews')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aside: CTA + availability */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="glow-gold">
              <CardHeader><CardTitle className="text-base">{t('connect.title')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {p.verification_status !== 'verified' ? (
                  <p className="text-sm text-muted-foreground">{isBn ? 'শুধুমাত্র যাচাইকৃত আইনজীবীর সাথে পরামর্শ শুরু করা যায়।' : 'Consultations can only be started with verified advocates.'}</p>
                ) : lastMatterId ? (
                  <ConnectDialog
                    matterId={lastMatterId}
                    advocateId={p.id}
                    advocateName={p.name}
                    trigger={<Button size="lg" className="w-full">{t('common.requestConsultation')}</Button>}
                  />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{t('common.startMatter')}</p>
                    <Button asChild size="lg" className="w-full"><Link href="/intake">{t('matters.empty.cta')}</Link></Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-gold" /> {t('advocates.availability')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availQ.loading ? (
                  <><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></>
                ) : availableDays.length > 0 ? (
                  availableDays.map((d) => (
                    <div key={d.date} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{new Date(d.date).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <Badge variant="success">{d.slots.filter((s) => s.available).length} slots</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{isBn ? 'এই মুহূর্তে কোনো সময় খালি নেই।' : 'No open slots right now.'}</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">{icon}{label}</span>
      <div className="flex flex-wrap justify-end gap-1.5 sm:max-w-[70%]">{children}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card><CardContent className="flex gap-4 py-6"><Skeleton className="size-20 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></CardContent></Card>
        <Card><CardContent className="space-y-3 py-6"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
      </div>
      <aside className="space-y-4"><Card><CardContent className="py-6"><Skeleton className="h-11 w-full" /></CardContent></Card></aside>
    </div>
  );
}
