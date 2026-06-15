'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Check, Upload, Loader2, FileText, FileCheck2,
  User, Scale, Layers, ShieldCheck, Sparkles,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api/client';
import { useQuery } from '@/hooks/useApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChipToggle, TagInput } from '@/components/features/tag-input';
import { PRACTICE_AREAS, WB_DISTRICTS, LANGUAGE_OPTIONS, COMMON_COURTS, BIO_MAX, STATE_BAR_COUNCIL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AdvocateSelf, AdvocateDoc } from '@/types';
import type { TranslationKey } from '@/i18n/config';

type StepMeta = { key: TranslationKey; desc: TranslationKey; icon: React.ComponentType<{ className?: string }> };
const STEPS: StepMeta[] = [
  { key: 'adv.onb.s1', desc: 'adv.onb.s1.desc', icon: User },
  { key: 'adv.onb.s2', desc: 'adv.onb.s2.desc', icon: Scale },
  { key: 'adv.onb.s3', desc: 'adv.onb.s3.desc', icon: Layers },
  { key: 'adv.onb.s4', desc: 'adv.onb.s4.desc', icon: FileCheck2 },
];
const TOTAL = STEPS.length;

/* ── Entry: fetch the advocate, then mount the wizard once data is in so the
   form state can be seeded from a useState initializer (no setState-in-effect). ── */
export default function OnboardingPage() {
  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), []);
  if (meQ.loading && !meQ.data) return <OnboardingSkeleton />;
  return <OnboardingWizard initial={meQ.data} />;
}

function OnboardingWizard({ initial }: { initial: AdvocateSelf | null }) {
  const { t } = useLanguage();
  const router = useRouter();
  const reduce = useReducedMotion();
  const docsQ = useQuery<AdvocateDoc[]>(() => api.get('/advocate/documents'), []);

  const [step, setStep] = React.useState(1);
  const [furthest, setFurthest] = React.useState(1);
  const [direction, setDirection] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Seed the form once from the loaded profile (lazy initializer — runs at mount only).
  const [f, setF] = React.useState(() => ({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    address: initial?.address ?? '',
    barEnrolmentNumber: initial?.bar_enrolment_number ?? '',
    stateBar: initial?.state_bar ?? '',
    bio: initial?.bio ?? '',
    practiceAreas: initial?.practice_areas?.length ? initial.practice_areas : ([] as string[]),
    languages: initial?.languages?.length ? initial.languages : (['en'] as string[]),
    districts: initial?.districts ?? ([] as string[]),
    courts: initial?.courts ?? ([] as string[]),
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((p) => ({ ...p, [k]: v })); setError(''); };

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
    const target = Math.min(TOTAL, step + 1);
    setDirection(1);
    setStep(target);
    setFurthest((m) => Math.max(m, target));
    setError('');
  }
  function back() {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
    setError('');
  }
  function goTo(target: number) {
    if (target > furthest || target === step) return; // only revisit reached steps
    setDirection(target > step ? 1 : -1);
    setStep(target);
    setError('');
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
    for (let s = 1; s <= 3; s++) { const e = validate(s); if (e) { setDirection(s < step ? -1 : 1); setStep(s); setError(e); return; } }
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
  const meta = STEPS[step - 1];

  const stepVariants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -28 : 28 }),
      };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift lg:grid lg:grid-cols-[300px_1fr]"
      >
        {/* ── Left journey rail (desktop) ── */}
        <aside className="relative hidden overflow-hidden border-r border-border bg-brand-soft p-7 lg:flex lg:flex-col lg:justify-between">
          {/* soft floating accent */}
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-gold/20 blur-3xl animate-pulse-glow" />
          <div className="relative">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-soft">
              <ShieldCheck className="size-6" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{t('adv.onb.railTitle')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t('adv.onb.railBody')}</p>

            <RailStepper step={step} furthest={furthest} onGo={goTo} t={t} />
          </div>

          <div className="relative mt-8 flex items-start gap-2.5 rounded-xl border border-border/70 bg-card/60 p-3.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{t('adv.onb.reassure')}</span>
          </div>
        </aside>

        {/* ── Right form column ── */}
        <div className="flex min-w-0 flex-col p-5 sm:p-7">
          {/* Mobile stepper */}
          <div className="lg:hidden">
            <MobileStepper step={step} furthest={furthest} onGo={goTo} />
          </div>

          {/* Header */}
          <div className="mt-5 lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              {t('adv.onb.step')} {step} {t('adv.onb.stepOf')} {TOTAL}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{t(meta.key)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t(meta.desc)}</p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-brand-gradient"
                initial={false}
                animate={{ width: `${(step / TOTAL) * 100}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          {/* Animated step content */}
          <div className="mt-6 flex-1">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                {step === 1 && (
                  <>
                    <Field label={t('settings.name')}><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Adv. Full Name" /></Field>
                    <Field label={t('adv.profile.phone')}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98XXXXXXXX" inputMode="tel" /></Field>
                    <Field label={t('settings.address')}><Textarea value={f.address} onChange={(e) => set('address', e.target.value)} className="min-h-20" placeholder="Chamber / office address" /></Field>
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
                      <Textarea value={f.bio} onChange={(e) => set('bio', e.target.value.slice(0, BIO_MAX))} className="min-h-24" placeholder={t('adv.profile.bioHint')} />
                      <p className="text-right text-xs text-muted-foreground">{f.bio.length}/{BIO_MAX}</p>
                    </Field>
                  </>
                )}
                {step === 4 && (
                  <>
                    <p className="text-sm text-muted-foreground">{t('adv.docs.hint')}</p>
                    <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={onUpload} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-9 text-center transition-colors hover:border-gold/50 hover:bg-gold/5 disabled:opacity-60"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-gold/12 text-gold transition-transform group-hover:scale-105">
                        {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                      </span>
                      <span className="text-sm font-medium text-foreground">{t('adv.docs.upload')}</span>
                      <span className="text-xs text-muted-foreground">PDF · JPG · PNG</span>
                    </button>
                    {docs.length > 0 && (
                      <ul className="space-y-2">
                        {docs.map((d) => (
                          <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                            <FileText className="size-4 shrink-0 text-gold" />
                            <span className="uppercase">{d.file_type?.split('/').pop() || 'FILE'}</span>
                            <Check className="ml-auto size-4 text-success" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Nav */}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button variant="ghost" disabled={step === 1} onClick={back}>
              <ArrowLeft className="size-4" /> {t('adv.onb.back')}
            </Button>
            {step < TOTAL ? (
              <Button onClick={next}>{t('adv.onb.next')} <ArrowRight className="size-4" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="bg-brand-gradient">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> {t('adv.onb.submit')}</>}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Vertical stepper for the desktop rail ── */
function RailStepper({
  step, furthest, onGo, t,
}: {
  step: number;
  furthest: number;
  onGo: (n: number) => void;
  t: (k: TranslationKey) => string;
}) {
  return (
    <ol className="mt-7 space-y-0">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        const reachable = num <= furthest;
        const Icon = s.icon;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={s.key} className="flex gap-3">
            {/* indicator column with connector */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300',
                  done
                    ? 'border-transparent bg-brand-gradient text-white shadow-soft'
                    : active
                      ? 'border-gold bg-card text-gold'
                      : 'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              {!isLast && (
                <span className={cn('my-1 w-0.5 flex-1 rounded-full transition-colors duration-300', done ? 'bg-gold' : 'bg-border')} />
              )}
            </div>
            {/* label */}
            <button
              type="button"
              onClick={() => onGo(num)}
              disabled={!reachable || active}
              className={cn(
                'group -mt-0.5 min-w-0 flex-1 rounded-lg px-2 pb-6 pt-1 text-left transition-colors',
                reachable && !active && 'hover:bg-card/60',
                !reachable && 'cursor-default',
              )}
            >
              <span className={cn('block text-sm font-semibold transition-colors', active ? 'text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground')}>
                {t(s.key)}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{t(s.desc)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Compact horizontal stepper for mobile ── */
function MobileStepper({ step, furthest, onGo }: { step: number; furthest: number; onGo: (n: number) => void }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const num = i + 1;
        const done = step > num;
        const active = step === num;
        const reachable = num <= furthest;
        const isLast = i === STEPS.length - 1;
        return (
          <React.Fragment key={s.key}>
            <button
              type="button"
              onClick={() => onGo(num)}
              disabled={!reachable || active}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold transition-colors duration-300',
                done
                  ? 'border-transparent bg-brand-gradient text-white'
                  : active
                    ? 'border-gold text-gold ring-4 ring-gold/15'
                    : 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" /> : num}
            </button>
            {!isLast && <span className={cn('mx-1 h-0.5 flex-1 rounded-full transition-colors duration-300', step > num ? 'bg-gold' : 'bg-border')} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function OnboardingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lift lg:grid lg:grid-cols-[300px_1fr]">
        <div className="hidden border-r border-border bg-brand-soft p-7 lg:block">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="mt-4 h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-52" />
          <div className="mt-8 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-36" /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 sm:p-7">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-11 w-full rounded-lg" /></div>
            ))}
          </div>
          <div className="mt-7 flex justify-between border-t border-border pt-5">
            <Skeleton className="h-10 w-24 rounded-lg" /><Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
