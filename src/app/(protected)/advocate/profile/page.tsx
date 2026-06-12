'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChipToggle } from '@/components/features/tag-input';
import { MultiSelect } from '@/components/features/multi-select';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { PRACTICE_AREAS, WB_DISTRICTS, LANGUAGE_OPTIONS, COMMON_COURTS, BIO_MAX, STATE_BAR_COUNCIL } from '@/lib/constants';
import type { AdvocateSelf } from '@/types';

export default function AdvocateProfilePage() {
  const { t } = useLanguage();
  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), []);

  const [form, setForm] = React.useState({
    name: '', phone: '', barEnrolmentNumber: '', bio: '',
    practiceAreas: [] as string[], languages: [] as string[], districts: [] as string[], courts: [] as string[],
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const d = meQ.data;
    if (!d) return;
    setForm({
      name: d.name ?? '',
      phone: d.phone ?? '',
      barEnrolmentNumber: d.bar_enrolment_number ?? '',
      bio: d.bio ?? '',
      practiceAreas: d.practice_areas ?? [],
      languages: d.languages ?? [],
      districts: d.districts ?? [],
      courts: d.courts ?? [],
    });
  }, [meQ.data]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Common courts + any already-saved custom court, so existing values stay selectable.
  const courtOptions = React.useMemo(
    () => Array.from(new Set([...COMMON_COURTS, ...form.courts])),
    [form.courts],
  );

  async function save() {
    setSaving(true);
    try {
      await api.put('/advocate/profile', {
        // Full name + State Bar Council are intentionally omitted — they're fixed.
        phone: form.phone.trim() || undefined,
        barEnrolmentNumber: form.barEnrolmentNumber.trim() || undefined,
        bio: form.bio.trim() || undefined,
        practiceAreas: form.practiceAreas,
        languages: form.languages,
        districts: form.districts,
        courts: form.courts,
      });
      toast.success(t('adv.profile.saved'));
      meQ.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setSaving(false);
    }
  }

  if (meQ.loading && !meQ.data) {
    return <div className="w-full px-4 py-6 sm:px-6"><Skeleton className="h-[34rem] w-full rounded-2xl" /></div>;
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{t('adv.profile.title')}</CardTitle>
            {meQ.data && <VerificationBadge status={meQ.data.verification_status} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-7">
          {/* Identity & credentials */}
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t('settings.name')}>
              <div className="relative">
                <Input value={form.name} disabled readOnly className="cursor-not-allowed pr-9 opacity-70" />
                <Lock className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{t('adv.profile.nameLocked')}</p>
            </Field>
            <Field label={t('adv.profile.phone')}>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91…" />
            </Field>
            <Field label={t('adv.profile.bar')}>
              <Input value={form.barEnrolmentNumber} onChange={(e) => set('barEnrolmentNumber', e.target.value)} placeholder="WB/0000/0000" />
            </Field>
            <Field label={t('adv.profile.stateBar')}>
              <div className="relative">
                <Input value={STATE_BAR_COUNCIL} disabled readOnly className="cursor-not-allowed pr-9 opacity-70" />
                <Lock className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{t('adv.profile.stateBarFixed')}</p>
            </Field>
          </div>

          {/* Expertise */}
          <div className="grid gap-x-6 gap-y-5 lg:grid-cols-2">
            <Field label={t('adv.profile.practiceAreas')}>
              <ChipToggle options={PRACTICE_AREAS} value={form.practiceAreas} onChange={(v) => set('practiceAreas', v)} />
            </Field>
            <Field label={t('adv.profile.languages')}>
              <ChipToggle options={LANGUAGE_OPTIONS} value={form.languages} onChange={(v) => set('languages', v)} />
            </Field>
            <Field label={t('adv.profile.districts')}>
              <MultiSelect options={WB_DISTRICTS} value={form.districts} onChange={(v) => set('districts', v)} placeholder={t('adv.profile.districts')} />
            </Field>
            <Field label={t('adv.profile.courts')}>
              <MultiSelect options={courtOptions} value={form.courts} onChange={(v) => set('courts', v)} placeholder={t('adv.profile.courts')} />
            </Field>
          </div>

          <Field label={t('adv.profile.bio')}>
            <Textarea value={form.bio} onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))} className="min-h-24" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t('adv.profile.bioHint')}</p>
              <p className="text-xs text-muted-foreground">{form.bio.length}/{BIO_MAX}</p>
            </div>
          </Field>

          <Button size="lg" disabled={saving} onClick={save}>
            {saving ? <><Loader2 className="size-4 animate-spin" />…</> : <><Save className="size-4" /> {t('shared.save')}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
