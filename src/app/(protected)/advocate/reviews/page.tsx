'use client';

import { Star, EyeOff } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { RatingStars } from '@/components/features/rating-stars';
import type { MyReviews } from '@/types';

export default function AdvocateReviewsPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<MyReviews>(() => api.get('/advocate/reviews'), []);
  const d = q.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.reviews.title')}</h1>

      {q.loading && !d ? (
        <div className="mt-6 space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div>
      ) : d ? (
        <>
          <Card className="mt-6">
            <CardContent className="flex items-center gap-6 py-6">
              <div className="text-center">
                <p className="font-display text-4xl font-semibold">{d.averageRating != null ? d.averageRating.toFixed(1) : '—'}</p>
                <RatingStars rating={d.averageRating} />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{d.totalCount} {t('common.reviews')}</p>
                {d.hiddenCount > 0 && <p>{d.hiddenCount} {t('adv.reviews.hidden')}</p>}
              </div>
            </CardContent>
          </Card>

          {d.reviews.length === 0 ? (
            <div className="mt-6"><EmptyState icon={Star} title={t('adv.reviews.empty')} /></div>
          ) : (
            <div className="mt-6 space-y-4">
              {d.reviews.map((r) => (
                <Card key={r.id} className={r.isVisible === false ? 'opacity-70' : ''}>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{r.citizenName}</span>
                      <div className="flex items-center gap-2">
                        {r.isVisible === false && <Badge variant="muted"><EyeOff className="size-3" /> {t('adv.reviews.hidden')}</Badge>}
                        <RatingStars rating={r.rating} />
                      </div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{r.comment}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-6"><EmptyState icon={Star} title={t('adv.reviews.empty')} /></div>
      )}
    </div>
  );
}
