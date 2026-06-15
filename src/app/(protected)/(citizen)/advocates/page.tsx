'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, BadgeCheck, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery, useDebouncedValue } from '@/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvocateCard, AdvocateCardSkeleton } from '@/components/features/advocate-card';
import { AdvocateSearch, type SearchSuggestion } from '@/components/features/advocate-search';
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
  const [search, setSearch] = React.useState('');
  const [practiceArea, setPracticeArea] = React.useState(ALL);
  const [lang, setLang] = React.useState(ALL);
  const [district, setDistrict] = React.useState(ALL);
  const [verifiedOnly, setVerifiedOnly] = React.useState(true);
  const [page, setPage] = React.useState(1);

  // Debounce the free-text search so we hit the backend once the user pauses,
  // not on every keystroke. Clearing it (empty box) takes effect immediately —
  // we never want to wait out the debounce just to widen results back.
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const effectiveSearch = search.trim() ? debouncedSearch : '';

  // Any change that narrows/widens the result set sends us back to page 1.
  // Done in the change handlers (not an effect) so it's a single render pass.
  const goFirstPage = () => setPage(1);
  const changeSearch = (v: string) => { setSearch(v); goFirstPage(); };
  const changePracticeArea = (v: string) => { setPracticeArea(v); goFirstPage(); };
  const changeDistrict = (v: string) => { setDistrict(v); goFirstPage(); };
  const changeLang = (v: string) => { setLang(v); goFirstPage(); };
  const toggleVerified = () => { setVerifiedOnly((v) => !v); goFirstPage(); };

  const q = useQuery<AdvocateDirectoryResponse>(
    () =>
      api.get('/advocates', {
        skipAuth: true,
        query: {
          q: effectiveSearch || undefined,
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
    [effectiveSearch, practiceArea, lang, district, verifiedOnly, page],
  );

  const data = q.data;
  const filtersActive = practiceArea !== ALL || lang !== ALL || district !== ALL || !verifiedOnly || search !== '';

  // A suggestion picked from the search box applies a structured filter (exact,
  // faster) and clears the free-text query so the two don't compete.
  function handleSuggestion(s: SearchSuggestion) {
    if (s.type === 'category') setPracticeArea(s.value);
    else if (s.type === 'district') setDistrict(s.value);
    setSearch('');
    goFirstPage();
  }

  function resetAll() {
    setSearch('');
    setPracticeArea(ALL);
    setLang(ALL);
    setDistrict(ALL);
    setVerifiedOnly(true);
    goFirstPage();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Title + search + filters. On mobile this is a plain in-flow section so
          the console header stays the only top bar (matching /matters). On sm+
          it becomes a frosted bar that sticks just below the console header. */}
      <div className="relative sm:sticky sm:top-14 sm:z-20 sm:border-b sm:border-border sm:bg-background/95 sm:shadow-sm sm:backdrop-blur sm:supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto w-full max-w-7xl px-4 pb-3 pt-5 sm:px-6 sm:py-3">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t('advocates.title')}</h1>
            {data && data.total > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                {data.total} {data.total === 1 ? t('advocates.count.one') : t('advocates.count.many')}
              </span>
            )}
          </div>

          {/* Search with autocomplete */}
          <AdvocateSearch
            className="mt-3"
            value={search}
            onChange={changeSearch}
            onSelectSuggestion={handleSuggestion}
            categories={PRACTICE_AREAS}
            districts={DISTRICTS}
            placeholder={t('advocates.search.placeholder')}
            labels={{
              categories: t('advocates.search.categories'),
              districts: t('advocates.search.districts'),
              clear: t('advocates.search.clear'),
            }}
          />

          {/* Filters — horizontal scroll on mobile, wrap on larger screens */}
          <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:pb-0">
            <FilterSelect value={practiceArea} onChange={changePracticeArea}
              options={PRACTICE_AREAS.map((a) => ({ v: a, l: a }))} allLabel={t('advocates.filter.area')} />
            <FilterSelect value={district} onChange={changeDistrict}
              options={DISTRICTS.map((d) => ({ v: d, l: d }))} allLabel={t('advocates.filter.district')} />
            <FilterSelect value={lang} onChange={changeLang}
              options={LANGUAGES.map((x) => ({ v: x.v, l: x.l }))} allLabel={t('advocates.filter.language')} />
            <button
              type="button"
              onClick={toggleVerified}
              aria-pressed={verifiedOnly}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
                verifiedOnly
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <BadgeCheck className="size-4" /> {t('advocates.filter.verified')}
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" /> {t('advocates.reset')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {q.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <AdvocateCardSkeleton key={i} />)}
          </div>
        ) : data && data.advocates.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
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
          <EmptyState
            icon={Search}
            title={t('advocates.empty')}
            action={
              filtersActive ? (
                <Button variant="outline" onClick={resetAll}>{t('advocates.reset')}</Button>
              ) : undefined
            }
          />
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
      <SelectTrigger className={cn('h-9 w-auto min-w-[8.5rem] shrink-0 gap-1.5 rounded-lg', value !== ALL && 'border-gold/45 text-foreground')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
