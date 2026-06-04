'use client';

import * as React from 'react';
import { Star, EyeOff, MessageSquareQuote } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarFallback } from '@/components/ui/avatar';
import { ViewableAvatar } from '@/components/shared/viewable-avatar';
import { EmptyState } from '@/components/shared/empty-state';
import { RatingStars } from '@/components/features/rating-stars';
import { cn } from '@/lib/utils';
import type { MyReviews, FeedbackReview } from '@/types';

function initials(name: string) {
  return (name || 'A').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
}

/** Circular gauge for the average rating (value 0–5). */
function RatingRing({ value }: { value: number | null }) {
  const pct = value ? Math.max(0, Math.min(1, value / 5)) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <svg className="size-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} strokeWidth="10" stroke="currentColor" className="fill-none text-border" />
        <circle
          cx="60" cy="60" r={r} strokeWidth="10" strokeLinecap="round" stroke="currentColor"
          className="fill-none text-gold transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-4xl font-bold leading-none">{value != null ? value.toFixed(1) : '—'}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{'★'.repeat(5)}</p>
      </div>
    </div>
  );
}

export default function AdvocateReviewsPage() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const q = useQuery<MyReviews>(() => api.get('/advocate/reviews'), []);
  const d = q.data;

  // Star distribution (5★ → 1★) computed from the full review list.
  const dist = React.useMemo(() => {
    const reviews = d?.reviews ?? [];
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  }, [d?.reviews]);
  const total = d?.reviews.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.reviews.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adv.reviews.subtitle')}</p>

      {q.loading && !d ? (
        <div className="mt-6 space-y-4"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="h-24 rounded-xl" /></div>
      ) : d ? (
        <>
          {/* Overall rating hero */}
          <Card className="mt-6 overflow-hidden">
            <CardContent className="relative grid gap-6 py-7 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gold/10 blur-3xl" />
              <div className="relative flex flex-col items-center gap-2">
                <RatingRing value={d.averageRating} />
                <p className="text-xs text-muted-foreground">{t('adv.reviews.outOf')}</p>
              </div>

              <div className="relative space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars rating={d.averageRating} size="md" />
                  <span className="text-sm text-muted-foreground">
                    {d.totalCount} {t('common.reviews')}
                    {d.hiddenCount > 0 && ` · ${d.hiddenCount} ${t('adv.reviews.hidden')}`}
                  </span>
                </div>
                {dist.map((row) => (
                  <div key={row.star} className="flex items-center gap-2.5 text-sm">
                    <span className="flex w-6 shrink-0 items-center justify-end gap-0.5 text-muted-foreground">
                      {row.star}<Star className="size-3 fill-gold text-gold" />
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-gold transition-all duration-700"
                        style={{ width: `${total ? (row.count / total) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Review list */}
          {d.reviews.length === 0 ? (
            <div className="mt-6"><EmptyState icon={MessageSquareQuote} title={t('adv.reviews.empty')} /></div>
          ) : (
            <div className="mt-6 space-y-4">
              {d.reviews.map((r) => <ReviewCard key={r.id} r={r} isBn={isBn} hiddenLabel={t('adv.reviews.hidden')} />)}
            </div>
          )}
        </>
      ) : (
        <div className="mt-6"><EmptyState icon={Star} title={t('adv.reviews.empty')} /></div>
      )}
    </div>
  );
}

function ReviewCard({ r, isBn, hiddenLabel }: { r: FeedbackReview; isBn: boolean; hiddenLabel: string }) {
  return (
    <Card className={cn('transition-all hover:shadow-soft', r.isVisible === false && 'opacity-70')}>
      <CardContent className="py-5">
        <div className="flex items-start gap-3.5">
          <ViewableAvatar
            src={r.citizenAvatarUrl}
            name={r.citizenName}
            className="size-11 shrink-0 ring-1 ring-border"
            fallback={<AvatarFallback className="text-sm font-semibold">{initials(r.citizenName)}</AvatarFallback>}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{r.citizenName}</span>
              <RatingStars rating={r.rating} />
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString(isBn ? 'bn-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {r.isVisible === false && <Badge variant="muted"><EyeOff className="size-3" /> {hiddenLabel}</Badge>}
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed text-foreground/85">“{r.comment}”</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
