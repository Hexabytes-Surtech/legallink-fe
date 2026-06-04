'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Upload, Loader2, FileText } from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ChipToggle, TagInput } from '@/components/features/tag-input';
import { PRACTICE_AREAS, WB_DISTRICTS, LANGUAGE_OPTIONS, COMMON_COURTS, BIO_MAX, STATE_BAR_COUNCIL } from '@/lib/constants';
import type { AdvocateSelf, AdvocateDoc } from '@/types';

const STEP_KEYS = ['adv.onb.s1', 'adv.onb.s2', 'adv.onb.s3', 'adv.onb.s4'] as const;

export default function OnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), []);
  const docsQ = useQuery<AdvocateDoc[]>(() => api.get('/advocate/documents'), []);

  const [step, setStep] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [f, setF] = React.useState({
    name: '', phone: '', address: '', barEnrolmentNumber: '', stateBar: '', bio: '',
    practiceAreas: [] as string[], languages: ['en'] as string[], districts: [] as string[], courts: [] as string[],
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((p) => ({ ...p, [k]: v })); setError(''); };

  React.useEffect(() => {
    const d = meQ.data;
    if (!d) return;
    setF((p) => ({
      ...p,
      name: d.name ?? '', phone: d.phone ?? '', address: d.address ?? '',
      barEnrolmentNumber: d.bar_enrolment_number ?? '', stateBar: d.state_bar ?? '', bio: d.bio ?? '',
      practiceAreas: d.practice_areas?.length ? d.practice_areas : [],
      languages: d.languages?.length ? d.languages : ['en'],
      districts: d.districts ?? [], courts: d.courts ?? [],
    }));
  }, [meQ.data]);

  function validate(s: number): string | null {
    if (s === 1 && !f.name.trim()) return 'Enter your full name.';
    if (s === 1 && !/^(\+91|0)?[6-9]\d{9}$/.test(f.phone.replace(/\s|-/g, ''))) return 'Enter a valid 10-digit Indian mobile number.';
    if (s === 2 && !f.barEnrolmentNumber.trim()) return 'Enter your Bar enrolment number.';
    if (s === 2 && f.courts.length === 0) return 'Add at least one court.';
    if (s === 3 && f.practiceAreas.length === 0) return 'Select at least one practice area.';
    if (s === 3 && f.districts.length === 0) return 'Select at least one district.';
    return null;
  }

  function next() {
    const err = validate(step);
    if (err) { setError(err); return; }
    setStep((s) => Math.min(4, s + 1));
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('document', file);
      await api.upload('/advocate/documents', fd);
      toast.success(t('adv.docs.uploaded'));
      docsQ.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function submit() {
    for (let s = 1; s <= 3; s++) { const e = validate(s); if (e) { setStep(s); setError(e); return; } }
    setSubmitting(true);
    try {
      await api.put('/advocate/profile', {
        name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim() || undefined,
        barEnrolmentNumber: f.barEnrolmentNumber.trim(), stateBar: STATE_BAR_COUNCIL,
        practiceAreas: f.practiceAreas, languages: f.languages, districts: f.districts, courts: f.courts,
        bio: f.bio.trim() || undefined,
      });
      await api.post('/advocate/submit-verification');
      toast.success(t('adv.onb.submitted'));
      router.push('/advocate/dashboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
      setSubmitting(false);
    }
  }

  const docs = docsQ.data ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t('adv.onb.title')}</h1>
      <p className="mt-1 text-muted-foreground">{t('adv.onb.subtitle')}</p>

      <div className="mt-6 flex items-center gap-2">
        {STEP_KEYS.map((k, i) => (
          <div key={k} className="flex flex-1 flex-col gap-1.5">
            <Progress value={step > i ? 100 : step === i + 1 ? 50 : 0} className="h-1.5" />
            <span className={`text-[11px] ${step === i + 1 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{t('adv.onb.step')} {i + 1} · {t(k)}</span>
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>{t(STEP_KEYS[step - 1])}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {step === 1 && (
            <>
              <Field label={t('settings.name')}><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label={t('adv.profile.phone')}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91…" /></Field>
              <Field label={t('settings.address')}><Textarea value={f.address} onChange={(e) => set('address', e.target.value)} className="min-h-20" /></Field>
            </>
          )}
          {step === 2 && (
            <>
              <Field label={t('adv.profile.bar')}><Input value={f.barEnrolmentNumber} onChange={(e) => set('barEnrolmentNumber', e.target.value)} placeholder="WB/0000/0000" /></Field>
              <Field label={t('adv.profile.stateBar')}>
                <Input value={STATE_BAR_COUNCIL} disabled readOnly className="cursor-not-allowed opacity-70" />
                <p className="text-xs text-muted-foreground">{t('adv.profile.stateBarFixed')}</p>
              </Field>
              <Field label={t('adv.profile.courts')}><TagInput value={f.courts} onChange={(v) => set('courts', v)} suggestions={COMMON_COURTS} placeholder={t('adv.profile.courts')} /></Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field label={t('adv.profile.practiceAreas')}><ChipToggle options={PRACTICE_AREAS} value={f.practiceAreas} onChange={(v) => set('practiceAreas', v)} /></Field>
              <Field label={t('adv.profile.languages')}><ChipToggle options={LANGUAGE_OPTIONS} value={f.languages} onChange={(v) => set('languages', v)} /></Field>
              <Field label={t('adv.profile.districts')}><ChipToggle options={WB_DISTRICTS} value={f.districts} onChange={(v) => set('districts', v)} /></Field>
              <Field label={t('adv.profile.bio')}>
                <Textarea value={f.bio} onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))} className="min-h-24" />
                <p className="text-right text-xs text-muted-foreground">{f.bio.length}/{BIO_MAX}</p>
              </Field>
            </>
          )}
          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">{t('adv.docs.hint')}</p>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={onUpload} />
              <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <><Loader2 className="size-4 animate-spin" />…</> : <><Upload className="size-4" /> {t('adv.docs.upload')}</>}
              </Button>
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <FileText className="size-4 text-gold" /> <span className="uppercase">{d.file_type?.split('/').pop() || 'FILE'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
              <ArrowLeft className="size-4" /> {t('adv.onb.back')}
            </Button>
            {step < 4 ? (
              <Button onClick={next}>{t('adv.onb.next')} <ArrowRight className="size-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" />…</> : <><Check className="size-4" /> {t('adv.onb.submit')}</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
