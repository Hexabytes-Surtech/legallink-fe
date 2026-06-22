'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Lock, Plus, Trash2, Briefcase } from 'lucide-react';
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

// ── Case History types ────────────────────────────────────────────────────────
interface CaseHistoryEntry {
  id: string;
  matter_type: string;
  court: string;
  district: string;
  outcome: 'won' | 'settled' | 'ongoing';
  year: number | null;
  notes: string | null;
  created_at: string;
}

const OUTCOME_LABELS: Record<string, string> = { won: 'Won', settled: 'Settled', ongoing: 'Ongoing' };
const OUTCOME_COLOURS: Record<string, string> = {
  won:     'bg-success/15 text-success border-success/25',
  settled: 'bg-gold/12 text-gold border-gold/25',
  ongoing: 'bg-muted text-muted-foreground border-border',
};

const BLANK_HISTORY = { matter_type: '', court: '', district: '', outcome: 'won' as const, year: '', notes: '' };

export default function AdvocateProfilePage() {
  const { t } = useLanguage();
  const meQ = useQuery<AdvocateSelf>(() => api.get('/advocate/me'), []);
  const historyQ = useQuery<CaseHistoryEntry[]>(() => api.get('/advocate/case-history'), []);

  const [form, setForm] = React.useState({
    name: '', phone: '', barEnrolmentNumber: '', bio: '',
    practiceAreas: [] as string[], languages: [] as string[], districts: [] as string[], courts: [] as string[],
  });
  const [saving, setSaving] = React.useState(false);

  // Case history add form state
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [addForm, setAddForm] = React.useState(BLANK_HISTORY);
  const [adding, setAdding] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

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
  const setA = <K extends keyof typeof addForm>(k: K, v: (typeof addForm)[K]) => setAddForm((f) => ({ ...f, [k]: v }));

  const courtOptions = React.useMemo(
    () => Array.from(new Set([...COMMON_COURTS, ...form.courts])),
    [form.courts],
  );

  async function save() {
    setSaving(true);
    try {
      await api.put('/advocate/profile', {
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

  async function addHistory() {
    if (!addForm.matter_type || !addForm.court.trim() || !addForm.district.trim()) {
      toast.error('Matter type, court, and district are required.');
      return;
    }
    setAdding(true);
    try {
      await api.post('/advocate/case-history', {
        matter_type: addForm.matter_type,
        court: addForm.court.trim(),
        district: addForm.district.trim(),
        outcome: addForm.outcome,
        year: addForm.year ? parseInt(addForm.year, 10) : undefined,
        notes: addForm.notes.trim() || undefined,
      });
      toast.success('Case added.');
      setAddForm(BLANK_HISTORY);
      setShowAddForm(false);
      historyQ.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setAdding(false);
    }
  }

  async function deleteHistory(id: string) {
    setDeletingId(id);
    try {
      await api.del(`/advocate/case-history/${id}`);
      toast.success('Entry removed.');
      historyQ.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.first : t('shared.error'));
    } finally {
      setDeletingId(null);
    }
  }

  if (meQ.loading && !meQ.data) {
    return <div className="w-full px-4 py-6 sm:px-6"><Skeleton className="h-[34rem] w-full rounded-2xl" /></div>;
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6">
      {/* ── Profile card ── */}
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

      {/* ── Case History card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-muted-foreground" />
              <CardTitle>Case History</CardTitle>
              {historyQ.data && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {historyQ.data.length}/50
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm((v) => !v)}>
              <Plus className="size-3.5" />
              Add case
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Past cases you&apos;ve handled. This information helps match you with citizens who have similar legal needs.
            No client names or personal details — only matter type, court, and outcome.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          {showAddForm && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-medium">Add a case</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Matter type *">
                  <select
                    value={addForm.matter_type}
                    onChange={(e) => setA('matter_type', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Select…</option>
                    {PRACTICE_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Court *">
                  <Input
                    value={addForm.court}
                    onChange={(e) => setA('court', e.target.value)}
                    placeholder="e.g. Alipore District Court"
                  />
                </Field>
                <Field label="District *">
                  <Input
                    value={addForm.district}
                    onChange={(e) => setA('district', e.target.value)}
                    placeholder="e.g. South 24 Parganas"
                  />
                </Field>
                <Field label="Outcome">
                  <select
                    value={addForm.outcome}
                    onChange={(e) => setA('outcome', e.target.value as typeof addForm.outcome)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="won">Won</option>
                    <option value="settled">Settled</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </Field>
                <Field label="Year (approx.)">
                  <Input
                    type="number"
                    min={1950}
                    max={2100}
                    value={addForm.year}
                    onChange={(e) => setA('year', e.target.value)}
                    placeholder="2023"
                  />
                </Field>
                <Field label="Brief description">
                  <Input
                    value={addForm.notes}
                    onChange={(e) => setA('notes', e.target.value.slice(0, 500))}
                    placeholder="Optional — no client names"
                  />
                </Field>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={adding} onClick={addHistory}>
                  {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setAddForm(BLANK_HISTORY); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Entries list */}
          {historyQ.loading && !historyQ.data ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : !historyQ.data?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No cases added yet. Your case history helps citizens find the right advocate.
            </p>
          ) : (
            <div className="space-y-2">
              {historyQ.data.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.matter_type}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${OUTCOME_COLOURS[entry.outcome]}`}>
                        {OUTCOME_LABELS[entry.outcome]}
                      </span>
                      {entry.year && <span className="text-muted-foreground">{entry.year}</span>}
                    </div>
                    <p className="text-muted-foreground">
                      {entry.court} · {entry.district}
                    </p>
                    {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteHistory(entry.id)}
                    disabled={deletingId === entry.id}
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    aria-label="Remove entry"
                  >
                    {deletingId === entry.id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
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
