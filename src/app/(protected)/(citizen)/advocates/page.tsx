'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvocateCard, AdvocateCardSkeleton } from '@/components/features/advocate-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { PRACTICE_AREAS } from '@/lib/practice-areas';
import { cn } from '@/lib/utils';
import type { AdvocateDirectoryResponse } from '@/types';

const ALL = '__all__';
const DISTRICTS = ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Nadia', 'Darjeeling', 'Murshidabad'];
const LANGUAGES = [{ v: 'en', l: 'English' }, { v: 'bn', l: 'বাংলা' }];

export default function AdvocatesPage() {
  const { t } = useLanguage();
  const [practiceArea, setPracticeArea] = React.useState(ALL);
  const [lang, setLang] = React.useState(ALL);
  const [district, setDistrict] = React.useState(ALL);
  const [verifiedOnly, setVerifiedOnly] = React.useState(true);
  const [page, setPage] = React.useState(1);

  // Reset to page 1 whenever a filter changes.
  React.useEffect(() => setPage(1), [practiceArea, lang, district, verifiedOnly]);

  const q = useQuery<AdvocateDirectoryResponse>(
    () =>
      api.get('/advocates', {
        skipAuth: true,
        query: {
          practiceArea: practiceArea === ALL ? undefined : practiceArea,
          language: lang === ALL ? undefined : lang,
          district: district === ALL ? undefined : district,
          // Send the real boolean — `false` must reach the backend so it shows
          // unverified advocates too (omitting it makes the backend default to verified).
          verifiedOnly,
          page,
          limit: 9,
        },
      }),
    [practiceArea, lang, district, verifiedOnly, page],
  );

  const data = q.data;

  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky title + filters (stick just below the console header) */}
      <div className="sticky top-14 z-20 border-b border-border bg-background shadow-sm">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t('advocates.title')}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterSelect value={practiceArea} onChange={setPracticeArea}
              options={PRACTICE_AREAS.map((a) => ({ v: a, l: a }))} allLabel={t('advocates.filter.area')} />
            <FilterSelect value={district} onChange={setDistrict}
              options={DISTRICTS.map((d) => ({ v: d, l: d }))} allLabel={t('advocates.filter.district')} />
            <FilterSelect value={lang} onChange={setLang}
              options={LANGUAGES.map((x) => ({ v: x.v, l: x.l }))} allLabel={t('advocates.filter.language')} />
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              aria-pressed={verifiedOnly}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
                verifiedOnly
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <BadgeCheck className="size-4" /> {t('advocates.filter.verified')}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {q.loading ? (
          <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <AdvocateCardSkeleton key={i} />)}
          </div>
        ) : data && data.advocates.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {data.advocates.map((adv) => (
                <AdvocateCard
                  key={adv.id}
                  advocate={adv}
                  action={<Button asChild variant="outline" className="w-full"><Link href={`/advocates/${adv.id}`}>{t('common.viewProfile')}</Link></Button>}
                />
              ))}
            </div>
            {data.pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {data.pages}</span>
                <Button variant="outline" size="icon" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState icon={Search} title={t('advocates.empty')} />
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value, onChange, options, allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('h-9 w-auto min-w-[8.5rem] gap-1.5 rounded-lg', value !== ALL && 'border-gold/45 text-foreground')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
