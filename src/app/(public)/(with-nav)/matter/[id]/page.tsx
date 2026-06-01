'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AiBrief, AiBriefSkeleton } from '@/components/features/ai-brief';
import { AdvocateCard, AdvocateCardSkeleton } from '@/components/features/advocate-card';
import { ConnectDialog } from '@/components/features/connect-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import type { MatterDetail, MatchedAdvocatesResponse } from '@/types';

const PROCESSING = new Set(['created', 'processing']);

export default function MatterPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const isBn = language === 'bn';

  const matterQ = useQuery<MatterDetail>(() => api.get(`/matter/${id}`, { skipAuth: true }), [id]);
  const advocatesQ = useQuery<MatchedAdvocatesResponse>(
    () => api.get(`/matter/${id}/advocates`, { skipAuth: true, query: { limit: 6 } }),
    [id],
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

            {advocatesQ.loading ? (
              <div className="space-y-4"><AdvocateCardSkeleton /><AdvocateCardSkeleton /></div>
            ) : advocatesQ.data && advocatesQ.data.advocates.length > 0 ? (
              <div className="space-y-4">
                {advocatesQ.data.advocates.map((adv) => (
                  <AdvocateCard
                    key={adv.id}
                    advocate={adv}
                    action={
                      <ConnectDialog
                        matterId={id}
                        advocateId={adv.id}
                        advocateName={adv.name}
                        trigger={<Button className="w-full">{t('matter.advocates.request')}</Button>}
                      />
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
