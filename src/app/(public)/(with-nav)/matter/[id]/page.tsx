'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Users, Lock, CheckCircle2, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiBrief, AiBriefSkeleton } from '@/components/features/ai-brief';
import { AdvocateCard, AdvocateCardSkeleton } from '@/components/features/advocate-card';
import { ConnectDialog } from '@/components/features/connect-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import type { MatterDetail, MatchedAdvocatesResponse, ConsultationListItem } from '@/types';

const PROCESSING = new Set(['created', 'processing']);

export default function MatterPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isBn = language === 'bn';

  // No skipAuth: authenticated citizens send their token so the backend's OptionalJwtGuard
  // can verify ownership of claimed matters. Anonymous users send no token (same endpoint, no error).
  const matterQ = useQuery<MatterDetail>(() => api.get(`/matter/${id}`), [id]);
  // Matched advocates are gated behind login: anonymous users see the AI brief but
  // must sign up to view advocate matches. Only fetch when authenticated.
  const advocatesQ = useQuery<MatchedAdvocatesResponse>(
    () => api.get(`/matter/${id}/advocates`, { query: { limit: 6 } }),
    [id],
    { enabled: isAuthenticated },
  );
  // Once an advocate has accepted on this matter, the citizen is locked to them —
  // block requesting other advocates until that consultation ends.
  const consultsQ = useQuery<ConsultationListItem[]>(
    () => api.get('/consultations'),
    [id],
    { enabled: isAuthenticated },
  );
  const activeConsult = React.useMemo(
    () => (consultsQ.data ?? []).find((c) => c.matter_id === id && c.status === 'accepted'),
    [consultsQ.data, id],
  );

  const matter = matterQ.data;
  const stillProcessing = !!matter && !matter.aiResponse && PROCESSING.has(matter.status);

  // Poll while the AI brief is still being generated.
  React.useEffect(() => {
    if (!stillProcessing) return;
    const timer = setTimeout(() => matterQ.refetch(), 4000);
    return () => clearTimeout(timer);
  }, [stillProcessing, matterQ]);

  const initialLoading = matterQ.loading && !matter;
  const returnTo = encodeURIComponent(`/matter/${id}`);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t('shared.back')}
      </Link>

      {matterQ.error && !matter ? (
        <div className="mt-6">
          <EmptyState
            icon={FileText}
            title={t('matter.notFound')}
            action={<Button asChild><Link href="/">{t('matters.empty.cta')}</Link></Button>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Main: query + AI brief */}
          <div className="space-y-6 lg:col-span-2">
            {initialLoading ? (
              <>
                <Card><CardContent className="py-5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></CardContent></Card>
                <AiBriefSkeleton />
              </>
            ) : matter ? (
              <>
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="size-4 text-gold" /> {isBn ? 'আপনার বিবরণ' : 'Your description'}
                    </CardTitle>
                    <Badge variant="muted" className="uppercase">{matter.language}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm leading-relaxed text-foreground/90 ${matter.language === 'bn' ? 'font-bn' : ''}`}>{matter.query}</p>
                  </CardContent>
                </Card>
                <AiBrief matter={matter} />
              </>
            ) : null}
          </div>

          {/* Aside: matched advocates */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Users className="size-5 text-gold" /> {t('matter.advocates.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('matter.advocates.subtitle')}</p>

            {activeConsult && (
              <Card className="border-success/40 bg-success/5">
                <CardContent className="space-y-2 py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle2 className="size-4" /> {t('matter.advocates.connectedTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('matter.advocates.connectedHint')}
                    {activeConsult.advocateName ? ` (${activeConsult.advocateName})` : ''}
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/messages/${activeConsult.consultationId}`}>
                      <MessageSquare className="size-4" /> {t('matters.openChat')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {authLoading ? (
              <div className="space-y-4"><AdvocateCardSkeleton /><AdvocateCardSkeleton /></div>
            ) : !isAuthenticated ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="grid size-11 place-items-center rounded-full bg-gold/12 text-gold">
                    <Lock className="size-5" />
                  </span>
                  <p className="font-display text-base font-semibold">{t('matter.advocates.locked')}</p>
                  <p className="text-sm text-muted-foreground">{t('matter.advocates.lockedHint')}</p>
                  <div className="mt-1 flex w-full flex-col gap-2">
                    <Button asChild className="w-full"><Link href={`/auth/signup?returnTo=${returnTo}`}>{t('matter.advocates.signup')}</Link></Button>
                    <Button asChild variant="outline" className="w-full"><Link href={`/auth/login?returnTo=${returnTo}`}>{t('matter.advocates.login')}</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ) : advocatesQ.loading ? (
              <div className="space-y-4"><AdvocateCardSkeleton /><AdvocateCardSkeleton /></div>
            ) : advocatesQ.data && advocatesQ.data.advocates.length > 0 ? (
              <div className="space-y-4">
                {advocatesQ.data.advocates.map((adv) => (
                  <AdvocateCard
                    key={adv.id}
                    advocate={adv}
                    action={
                      activeConsult ? (
                        <Button variant="outline" className="w-full" disabled>
                          {t('matter.advocates.alreadyConnected')}
                        </Button>
                      ) : (
                        <ConnectDialog
                          matterId={id}
                          advocateId={adv.id}
                          advocateName={adv.name}
                          trigger={<Button className="w-full">{t('matter.advocates.request')}</Button>}
                        />
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title={t('matter.advocates.empty')} />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
