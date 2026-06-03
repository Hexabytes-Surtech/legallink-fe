'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdvocateCard, AdvocateCardSkeleton } from '@/components/features/advocate-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { Reveal } from '@/components/shared/reveal';
import type { AdvocateDirectoryResponse } from '@/types';

const ALL = '__all__';
const PRACTICE_AREAS = ['Criminal', 'Civil', 'Family', 'Labour', 'Tenancy', 'Traffic', 'Consumer'];
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
          verifiedOnly: verifiedOnly ? true : undefined,
          page,
          limit: 9,
        },
      }),
    [practiceArea, lang, district, verifiedOnly, page],
  );

  const data = q.data;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <Reveal>
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('advocates.title')}</h1>
          <p className="mt-3 text-muted-foreground">{t('advocates.subtitle')}</p>
        </header>
      </Reveal>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
        </div>
        <FilterSelect label={t('advocates.filter.area')} value={practiceArea} onChange={setPracticeArea}
          options={PRACTICE_AREAS.map((a) => ({ v: a, l: a }))} allLabel={t('advocates.filter.all')} />
        <FilterSelect label={t('advocates.filter.language')} value={lang} onChange={setLang}
          options={LANGUAGES.map((x) => ({ v: x.v, l: x.l }))} allLabel={t('advocates.filter.all')} />
        <FilterSelect label={t('advocates.filter.district')} value={district} onChange={setDistrict}
          options={DISTRICTS.map((d) => ({ v: d, l: d }))} allLabel={t('advocates.filter.all')} />
        <div className="flex items-center gap-2 pb-2.5">
          <Switch id="verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
          <Label htmlFor="verified" className="cursor-pointer">{t('advocates.filter.verified')}</Label>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {q.loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <AdvocateCardSkeleton key={i} />)}
          </div>
        ) : data && data.advocates.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
  label, value, onChange, options, allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  allLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
