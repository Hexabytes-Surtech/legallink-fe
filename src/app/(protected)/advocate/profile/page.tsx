'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChipToggle, TagInput } from '@/components/features/tag-input';
import { VerificationBadge } from '@/components/shared/verification-badge';
import { PRACTICE_AREAS, WB_DISTRICTS, LANGUAGE_OPTIONS, COMMON_COURTS, BIO_MAX } from '@/lib/constants';
import type { AdvocateSelf } from '@/types';

export default function AdvocateProfilePage() {
  const { t } = useLanguage();
  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), []);

  const [form, setForm] = React.useState({
    name: '', phone: '', barEnrolmentNumber: '', stateBar: '', bio: '',
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
      stateBar: d.state_bar ?? '',
      bio: d.bio ?? '',
      practiceAreas: d.practice_areas ?? [],
      languages: d.languages ?? [],
      districts: d.districts ?? [],
      courts: d.courts ?? [],
    });
  }, [meQ.data]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await api.put('/advocate/profile', {
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        barEnrolmentNumber: form.barEnrolmentNumber.trim() || undefined,
        stateBar: form.stateBar.trim() || undefined,
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
    return <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6"><Skeleton className="h-96 w-full rounded-xl" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.profile.title')}</h1>
        {meQ.data && <VerificationBadge status={meQ.data.verification_status} />}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>{t('settings.profile')}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('settings.name')}><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label={t('adv.profile.phone')}><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91…" /></Field>
            <Field label={t('adv.profile.bar')}><Input value={form.barEnrolmentNumber} onChange={(e) => set('barEnrolmentNumber', e.target.value)} /></Field>
            <Field label={t('adv.profile.stateBar')}><Input value={form.stateBar} onChange={(e) => set('stateBar', e.target.value)} /></Field>
          </div>

          <Field label={t('adv.profile.practiceAreas')}>
            <ChipToggle options={PRACTICE_AREAS} value={form.practiceAreas} onChange={(v) => set('practiceAreas', v)} />
          </Field>
          <Field label={t('adv.profile.languages')}>
            <ChipToggle options={LANGUAGE_OPTIONS} value={form.languages} onChange={(v) => set('languages', v)} />
          </Field>
          <Field label={t('adv.profile.districts')}>
            <ChipToggle options={WB_DISTRICTS} value={form.districts} onChange={(v) => set('districts', v)} />
          </Field>
          <Field label={t('adv.profile.courts')}>
            <TagInput value={form.courts} onChange={(v) => set('courts', v)} suggestions={COMMON_COURTS} placeholder={t('adv.profile.courts')} />
          </Field>

          <Field label={t('adv.profile.bio')}>
            <Textarea value={form.bio} onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))} className="min-h-28" />
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
